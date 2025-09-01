import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { PrimeReactProvider, PrimeReactContext } from "primereact/api";
import "primeicons/primeicons.css";
import "primereact/resources/themes/lara-light-cyan/theme.css";

createRoot(document.getElementById("root")!).render(
	<PrimeReactProvider>
		<App />
	</PrimeReactProvider>
);
