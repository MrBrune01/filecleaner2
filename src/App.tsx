import React, { useState, useMemo, type ChangeEvent } from "react";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";

type Field = [string, number, number];

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

	function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const text = event.target?.result as string;
			const allLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

			setOriginalLines(allLines);

			const parsed = allLines.map(parseLine);
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
		<div className="p-6 max-w-5xl mx-auto">
			<h2 className="text-2xl font-bold mb-6">Pulizia File</h2>

			<input
				type="file"
				accept=".txt"
				onChange={handleFileChange}
				className="mb-4"
			/>
			<Button
				label="Salva come TXT"
				onClick={exportTXT}
				className="p-button-lg"
				disabled={parsedData.length === 0}
			/>

			<div className="mb-6">
				<p>
					<strong>Righe uniche dopo pulizia:</strong> {uniqueRowsCount}
				</p>
				<p>
					<strong>Righe visibili (dopo filtro):</strong> {filteredData.length}
				</p>
			</div>

			<div className="mb-6">
				<h4 className="font-semibold mb-2">Filtra per Marca</h4>
				<input
					type="text"
					placeholder="Cerca marca..."
					value={brandFilter}
					onChange={(e) => setBrandFilter(e.target.value)}
					className="mb-2 p-2 border rounded w-full"
				/>

				<div className="grid grid-cols-3 gap-2 max-h-100 overflow-auto border p-2 rounded text-xl">
					{filteredBrands.map((brand) => (
						<div key={brand} className="flex items-center gap-2">
							<Checkbox
								id={`brand-${brand}`}
								onChange={() => toggleBrand(brand)}
								checked={brandSelection[brand]}
							></Checkbox>
							<label htmlFor={`brand-${brand}`} className="text-sm">
								{brand}
							</label>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
