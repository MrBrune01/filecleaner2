import React, { useState, useMemo } from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { FileUpload, type FileUploadSelectEvent } from "primereact/fileupload";

type Field = [string, start: number, end: number];

const FIELDS: Field[] = [
	["Codice numerico EV", 0, 13],
	["Descrizione articolo", 44, 58],
	["Codice articolo EV", 58, 83],
	["Marca EV", 83, 89],
	["Unità di misura", 89, 91],
	["Campo non significativo", 91, 106],
	["Prezzo listino", 106, 121],
	["Sconto 1", 121, 126],
	["Sconto 2", 126, 131],
	["Sconto 3", 131, 136],
	["Sconto 4", 136, 141],
	["Prezzo netto", 141, 156],
	["Codice a barre METEL", 156, 169],
	["IVA", 169, 171],
	["Marca Metel", 171, 174],
	["Articolo Metel", 174, 190],
	["Descrizione Marca", 190, 215],
	["Tipo listino", 215, 216],
	["Gestione articolo", 216, 217],
	["Codice articolo cliente", 217, 242],
	["Moltiplicatore prezzo", 242, 247],
];

function parseLine(line: string): string[] {
	return FIELDS.map(([_, start, end]) => line.slice(start, end).trim());
}

export default function App() {
	const [parsedData, setParsedData] = useState<string[][]>([]);
	const [originalLines, setOriginalLines] = useState<string[]>([]);
	const [brandFilter, setBrandFilter] = useState<string>("");
	const [brandSelection, setBrandSelection] = useState<Record<string, boolean>>(
		{}
	);
	const [uniqueRowsCount, setUniqueRowsCount] = useState(0);

	function handleFileSelect(e: FileUploadSelectEvent) {
		const file = e.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const text = event.target?.result as string;
			const allLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

			const updatedLines: string[] = [];
			setOriginalLines(updatedLines);

			const parsed: string[][] = [];

			for (let line of allLines) {
				const row = parseLine(line);

				const prezzoListinoIdx = 6;
				const moltiplicatoreIdx = 20;
				const prezzoListinoRaw = row[prezzoListinoIdx]
					.replace(",", ".")
					.replace(/\s/g, "");
				const moltiplicatoreRaw = row[moltiplicatoreIdx]
					.replace(",", ".")
					.replace(/\s/g, "");

				const prezzoListino = parseFloat(prezzoListinoRaw);
				const moltiplicatore = parseFloat(moltiplicatoreRaw);

				let newRow = [...row]; // Copia della riga per sicurezza
				let modifiedLine = line;

				if (
					!isNaN(prezzoListino) &&
					!isNaN(moltiplicatore) &&
					moltiplicatore > 1
				) {
					const nuovoPrezzo = (prezzoListino / moltiplicatore)
						.toFixed(2)
						.replace(".", ",");

					// Aggiorna solo la parte del prezzo nella riga originale mantenendo la lunghezza
					const [_, start, end] = FIELDS[prezzoListinoIdx];
					const prezzoFormattato = nuovoPrezzo.padStart(end - start, " ");
					modifiedLine =
						line.slice(0, start) + prezzoFormattato + line.slice(end);

					// Aggiorna anche il campo nella riga parsata (per la tabella visiva)
					newRow[prezzoListinoIdx] = nuovoPrezzo;
				}

				parsed.push(newRow);
				updatedLines.push(modifiedLine);
			}

			const uniqueSet = new Set<string>();
			const uniqueRows: string[][] = [];

			for (let row of parsed) {
				const key = row.join("|");
				if (!uniqueSet.has(key)) {
					uniqueSet.add(key);
					uniqueRows.push(row);
				}
			}

			setUniqueRowsCount(uniqueRows.length);
			setParsedData(uniqueRows);

			const brands = Array.from(
				new Set(uniqueRows.map((r) => r[3]).filter(Boolean))
			);
			const brandMap: Record<string, boolean> = {};
			brands.forEach((b) => (brandMap[b] = false));
			setBrandSelection(brandMap);
		};
		reader.readAsText(file, "utf-8");
	}

	function toggleBrand(brand: string) {
		setBrandSelection((s) => ({ ...s, [brand]: !s[brand] }));
	}

	const filteredBrands = useMemo(() => {
		const search = brandFilter.toLowerCase();
		return Object.keys(brandSelection).filter((b) =>
			b.toLowerCase().includes(search)
		);
	}, [brandSelection, brandFilter]);

	const selectedBrands = useMemo(
		() =>
			Object.entries(brandSelection)
				.filter(([_, selected]) => selected)
				.map(([b]) => b),
		[brandSelection]
	);

	const filteredData = useMemo(() => {
		if (selectedBrands.length === 0) return parsedData;
		return parsedData.filter((row) => selectedBrands.includes(row[3]));
	}, [parsedData, selectedBrands]);

	function exportTXT() {
		if (originalLines.length === 0) return;
		if (selectedBrands.length === 0) {
			alert("Seleziona almeno una marca");
			return;
		}
		const outputLines = originalLines.filter((line) => {
			const parsed = parseLine(line);
			return selectedBrands.includes(parsed[3]);
		});

		const blob = new Blob([outputLines.join("\n")], {
			type: "text/plain;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "filtrato.txt";
		a.click();
		URL.revokeObjectURL(url);
	}

	return (
		<div className="p-2 max-w-5xl mx-auto">
			<div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<h2 className="text-2xl font-bold flex items-center gap-2">
					<span role="img" aria-label="Broom">
						🧹
					</span>
					Pulizia File
				</h2>
				<FileUpload
					mode="basic"
					name="demo[]"
					accept=".txt"
					onSelect={handleFileSelect}
					chooseLabel="Carica File"
					className="p-button-outlined"
				/>
				<Button
					label="Salva come TXT"
					onClick={exportTXT}
					className="p-button-lg p-button-success"
					disabled={parsedData.length === 0}
					icon="pi pi-download"
				/>
			</div>

			<div className="mb-6 flex flex-col sm:flex-row gap-4">
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex-1 flex flex-col items-center shadow-sm">
					<p className="text-blue-700 text-lg font-semibold flex items-center gap-2">
						<span role="img" aria-label="Unique">
							🔗
						</span>
						Righe uniche dopo pulizia:
					</p>
					<p className="text-3xl font-bold text-blue-900 mt-1">
						{uniqueRowsCount}
					</p>
				</div>
				<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex-1 flex flex-col items-center shadow-sm">
					<p className="text-green-700 text-lg font-semibold flex items-center gap-2">
						<span role="img" aria-label="Visible">
							👁️
						</span>
						Righe visibili (dopo filtro):
					</p>
					<p className="text-3xl font-bold text-green-900 mt-1">
						{filteredData.length}
					</p>
				</div>
			</div>

			<div className="mb-6">
				<h4 className="font-semibold mb-3 text-lg flex items-center gap-2">
					<span role="img" aria-label="Filtro">
						🔍
					</span>
					Filtra per Marca
				</h4>
				<input
					type="text"
					placeholder="Cerca marca..."
					value={brandFilter}
					onChange={(e) => setBrandFilter(e.target.value)}
					className="mb-3 p-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
				/>

				<div
					className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border border-gray-200 bg-gray-50 p-3 rounded-lg shadow-inner"
					style={{
						maxHeight: "calc(100vh - 300px)",
						minHeight: "300px",
						height: "100vh",
						overflow: "auto",
						display: "grid",
						alignContent: filteredBrands.length <= 3 ? "start" : undefined,
					}}
				>
					{filteredBrands.length === 0 && (
						<div className="col-span-full text-gray-400 italic text-center py-4">
							Nessuna marca trovata
						</div>
					)}
					{filteredBrands.map((brand) => (
						<label
							key={brand}
							htmlFor={`brand-${brand}`}
							className={`flex items-center gap-2 p-2 rounded cursor-pointer transition hover:bg-blue-50 ${
								brandSelection[brand] ? "bg-blue-100 font-semibold" : ""
							}`}
							style={filteredBrands.length <= 3 ? { minHeight: "48px" } : {}}
						>
							<Checkbox
								id={`brand-${brand}`}
								onChange={() => toggleBrand(brand)}
								checked={brandSelection[brand]}
								className="mr-2"
							/>
							<span className="truncate">{brand}</span>
						</label>
					))}
					{/* Filler per mantenere l'altezza minima se pochi risultati */}
					{filteredBrands.length > 0 &&
						filteredBrands.length < 3 &&
						Array.from({ length: 3 - filteredBrands.length }).map((_, i) => (
							<div key={`filler-${i}`} style={{ minHeight: "48px" }} />
						))}
				</div>
			</div>
		</div>
	);
}
