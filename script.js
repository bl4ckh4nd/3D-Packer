import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let szene, kamera, renderer, orbitSteuerung;
let verfuegbareKisten = []; 
let produkteZuVerpacken = []; 
let verpackteObjektMeshes = []; 
let aktuelleAnzeigeKistenAbmessungen = { b: 20, h: 15, t: 10 }; // Standard für Leinwandgröße

// --- UI Elemente ---
const kistenTypNameEingabe = document.getElementById('kistenTypName');
const kistenTypBreiteEingabe = document.getElementById('kistenTypBreite');
const kistenTypHoeheEingabe = document.getElementById('kistenTypHoehe');
const kistenTypTiefeEingabe = document.getElementById('kistenTypTiefe');
const kistenTypHinzufuegenKnopf = document.getElementById('kistenTypHinzufuegenKnopf');
const kistenTypListeDiv = document.getElementById('kistenTypListe');

const produktNameEingabe = document.getElementById('produktName');
const produktFormAuswahl = document.getElementById('produktForm');
const abmessungsEingabenContainer = document.getElementById('abmessungsEingabenContainer');
const produktAnzahlEingabe = document.getElementById('produktAnzahl');
const produktFarbeEingabe = document.getElementById('produktFarbe');
const produktIstZerbrechlichCheckbox = document.getElementById('produktIstZerbrechlich');
const produktKannAnderesEnthaltenCheckbox = document.getElementById('produktKannAnderesEnthalten');
const innenvolumenOptionenContainer = document.getElementById('innenvolumenOptionenContainer');
const innenvolumenFormAuswahl = document.getElementById('innenvolumenForm');
const innenvolumenAbmessungenContainer = document.getElementById('innenvolumenAbmessungenContainer');
const produktKannInAnderemPlatziertWerdenCheckbox = document.getElementById('produktKannInAnderemPlatziertWerden');
const produktHinzufuegenKnopf = document.getElementById('produktHinzufuegenKnopf');
const produktListeDiv = document.getElementById('produktListe');

const optimaleKisteFindenKnopf = document.getElementById('optimaleKisteFindenKnopf');
const allesZuruecksetzenKnopf = document.getElementById('allesZuruecksetzenKnopf');

const abmessungsWarnungDiv = document.getElementById('abmessungsWarnung');
const nachrichtenBoxContainer = document.getElementById('nachrichtenBoxContainer');

const ausgewaehlterKistenNameUI = document.getElementById('ausgewaehlterKistenName');
const ausgewaehlteKistenBreiteUI = document.getElementById('ausgewaehlteKistenBreite');
const ausgewaehlteKistenHoeheUI = document.getElementById('ausgewaehlteKistenHoehe');
const ausgewaehlteKistenTiefeUI = document.getElementById('ausgewaehlteKistenTiefe');

const statKistenVolumen = document.getElementById('statKistenVolumen');
const statAnzahlProdukteZuVerpacken = document.getElementById('statAnzahlProdukteZuVerpacken');
const statAnzahlVerpackteProdukte = document.getElementById('statAnzahlVerpackteProdukte');
const statVerpacktesVolumen = document.getElementById('statVerpacktesVolumen');
const statEffizienz = document.getElementById('statEffizienz');

// --- Dynamische UI für Produktabmessungen ---
function aktualisiereProduktAbmessungsEingaben() {
    const form = produktFormAuswahl.value;
    abmessungsEingabenContainer.innerHTML = ''; 
    let html = '';
    if (form === 'box') {
        html = `
            <div><label for="produktBreite" class="block text-sm font-medium text-gray-700 mb-1">Breite (cm)</label><input type="number" id="produktBreite" placeholder="B" min="0.1" step="0.1" value="5" class="w-full produkt-abmessung-eingabe"></div>
            <div><label for="produktHoehe" class="block text-sm font-medium text-gray-700 mb-1">Höhe (cm)</label><input type="number" id="produktHoehe" placeholder="H" min="0.1" step="0.1" value="3" class="w-full produkt-abmessung-eingabe"></div>
            <div><label for="produktTiefe" class="block text-sm font-medium text-gray-700 mb-1">Tiefe (cm)</label><input type="number" id="produktTiefe" placeholder="T" min="0.1" step="0.1" value="2" class="w-full produkt-abmessung-eingabe"></div>`;
    } else if (form === 'cylinder') {
        html = `
            <div><label for="produktRadius" class="block text-sm font-medium text-gray-700 mb-1">Radius (cm)</label><input type="number" id="produktRadius" placeholder="R" min="0.1" step="0.1" value="2" class="w-full produkt-abmessung-eingabe"></div>
            <div><label for="produktZylinderHoehe" class="block text-sm font-medium text-gray-700 mb-1">Höhe (cm)</label><input type="number" id="produktZylinderHoehe" placeholder="H" min="0.1" step="0.1" value="5" class="w-full produkt-abmessung-eingabe"></div>`;
    } else if (form === 'sphere') {
        html = `<div><label for="produktKugelRadius" class="block text-sm font-medium text-gray-700 mb-1">Radius (cm)</label><input type="number" id="produktKugelRadius" placeholder="R" min="0.1" step="0.1" value="2.5" class="w-full produkt-abmessung-eingabe"></div>`;
    }
    abmessungsEingabenContainer.innerHTML = html;
    document.querySelectorAll('.produkt-abmessung-eingabe').forEach(input => input.addEventListener('input', validiereProduktAbmessungenLive));
    validiereProduktAbmessungenLive();
}

function aktualisiereInnenvolumenAbmessungsEingaben() {
    const form = innenvolumenFormAuswahl.value;
    innenvolumenAbmessungenContainer.innerHTML = '';
    let html = '';
    if (form === 'box') {
        html = `
            <div><label for="innenvolumenBreite" class="block text-xs font-medium text-gray-600 mb-1">Innen-Breite (cm)</label><input type="number" id="innenvolumenBreite" placeholder="B" min="0.1" step="0.1" value="3" class="w-full text-sm p-1 produkt-abmessung-eingabe"></div>
            <div><label for="innenvolumenHoehe" class="block text-xs font-medium text-gray-600 mb-1">Innen-Höhe (cm)</label><input type="number" id="innenvolumenHoehe" placeholder="H" min="0.1" step="0.1" value="2" class="w-full text-sm p-1 produkt-abmessung-eingabe"></div>
            <div><label for="innenvolumenTiefe" class="block text-xs font-medium text-gray-600 mb-1">Innen-Tiefe (cm)</label><input type="number" id="innenvolumenTiefe" placeholder="T" min="0.1" step="0.1" value="1" class="w-full text-sm p-1 produkt-abmessung-eingabe"></div>`;
    } else if (form === 'cylinder') {
         html = `
            <div><label for="innenvolumenRadius" class="block text-xs font-medium text-gray-600 mb-1">Innen-Radius (cm)</label><input type="number" id="innenvolumenRadius" placeholder="R" min="0.1" step="0.1" value="1" class="w-full text-sm p-1 produkt-abmessung-eingabe"></div>
            <div><label for="innenvolumenZylinderHoehe" class="block text-xs font-medium text-gray-600 mb-1">Innen-Höhe (cm)</label><input type="number" id="innenvolumenZylinderHoehe" placeholder="H" min="0.1" step="0.1" value="4" class="w-full text-sm p-1 produkt-abmessung-eingabe"></div>`;
    }
    innenvolumenAbmessungenContainer.innerHTML = html;
     document.querySelectorAll('.produkt-abmessung-eingabe').forEach(input => input.addEventListener('input', validiereProduktAbmessungenLive)); // Ggf. separate Validierung für Innenvolumen
}

// --- App Nachrichten Funktion ---
function zeigeAppNachricht(nachricht, typ = 'info', dauer = 5000) {
    const nachrichtenDiv = document.createElement('div');
    let bgFarbe, textFarbe, randFarbe, icon;
    switch (typ) {
        case 'error': bgFarbe = 'bg-red-100'; textFarbe = 'text-red-700'; randFarbe = 'border-red-400'; icon = '<svg class="w-5 h-5 mr-2 inline" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v4a1 1 0 102 0V5zm-1 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path></svg>'; break;
        case 'warning': bgFarbe = 'bg-yellow-100'; textFarbe = 'text-yellow-700'; randFarbe = 'border-yellow-400'; icon = '<svg class="w-5 h-5 mr-2 inline" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.216 3.001-1.742 3.001H4.42c-1.526 0-2.492-1.667-1.742-3.001l5.58-9.92zM10 6a1 1 0 011 1v3a1 1 0 11-2 0V7a1 1 0 011-1zm1 7a1 1 0 10-2 0 1 1 0 002 0z" clip-rule="evenodd"></path></svg>'; break;
        default: bgFarbe = 'bg-blue-100'; textFarbe = 'text-blue-700'; randFarbe = 'border-blue-400'; icon = '<svg class="w-5 h-5 mr-2 inline" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd"></path></svg>'; break;
    }
    nachrichtenDiv.className = `nachrichtenElement p-4 mb-3 rounded-md border ${bgFarbe} ${textFarbe} ${randFarbe} shadow-lg flex items-center text-sm`;
    nachrichtenDiv.innerHTML = `${icon}<span>${nachricht}</span>`;
    nachrichtenBoxContainer.appendChild(nachrichtenDiv);
    setTimeout(() => { nachrichtenDiv.style.opacity = '0'; setTimeout(() => nachrichtenDiv.remove(), 300); }, dauer);
}

// --- Abmessungsvalidierung für Produkte ---
function validiereProduktAbmessungenLive() {
    const form = produktFormAuswahl.value;
    let warnungen = [];
    const GENERIC_MAX_DIM = 200; // Eine großzügige Annahme für die Vorabwarnung
    let pB, pH, pT, radius, hoehe;

    if (form === 'box') {
        pB = parseFloat(document.getElementById('produktBreite')?.value);
        pH = parseFloat(document.getElementById('produktHoehe')?.value);
        pT = parseFloat(document.getElementById('produktTiefe')?.value);
        if (!isNaN(pB) && pB > GENERIC_MAX_DIM) warnungen.push(`Produktbreite (${pB}cm) scheint sehr groß.`);
    } // Ähnliche Logik für andere Formen und Dimensionen...

    if (warnungen.length > 0) {
        abmessungsWarnungDiv.innerHTML = warnungen.join('<br>') + "<br>Stellen Sie sicher, dass die Abmessungen angemessen sind. Die endgültige Passform hängt von der ausgewählten Kiste ab.";
        abmessungsWarnungDiv.classList.remove('hidden');
    } else {
        abmessungsWarnungDiv.classList.add('hidden');
    }
}

// --- Kistentyp-Management ---
function kistenTypHinzufuegen() {
    const name = kistenTypNameEingabe.value.trim() || `Kistentyp ${verfuegbareKisten.length + 1}`;
    const b = parseFloat(kistenTypBreiteEingabe.value);
    const h = parseFloat(kistenTypHoeheEingabe.value);
    const t = parseFloat(kistenTypTiefeEingabe.value);

    if (isNaN(b) || isNaN(h) || isNaN(t) || b <= 0 || h <= 0 || t <= 0) {
        zeigeAppNachricht("Bitte geben Sie gültige positive Abmessungen für den Kistentyp ein.", "error"); return;
    }
    verfuegbareKisten.push({ id: `kiste_${Date.now()}`, name, b, h, t });
    aktualisiereKistenTypListenAnzeige();
    kistenTypNameEingabe.value = ''; 
    kistenTypBreiteEingabe.value = (b + 5).toFixed(1); 
    kistenTypHoeheEingabe.value = (h + 5).toFixed(1);
    kistenTypTiefeEingabe.value = (t + 2).toFixed(1);
    zeigeAppNachricht(`Kistentyp "${name}" hinzugefügt.`, "info");
}

function aktualisiereKistenTypListenAnzeige() {
    kistenTypListeDiv.innerHTML = '';
    if (verfuegbareKisten.length === 0) {
        kistenTypListeDiv.innerHTML = '<p class="text-gray-500 italic">Noch keine Kistentypen definiert.</p>'; return;
    }
    verfuegbareKisten.forEach(kiste => {
        const kistenEl = document.createElement('div');
        kistenEl.className = 'p-2 bg-white rounded-md border border-gray-300 flex justify-between items-center text-sm';
        kistenEl.innerHTML = `<span>${kiste.name} (B:${kiste.b}, H:${kiste.h}, T:${kiste.t} cm)</span><button data-id="${kiste.id}" class="entferne-kistentyp-knopf text-red-500 hover:text-red-700 font-medium">Entfernen</button>`;
        kistenTypListeDiv.appendChild(kistenEl);
    });
    document.querySelectorAll('.entferne-kistentyp-knopf').forEach(knopf => {
        knopf.addEventListener('click', (e) => {
            const kistenId = e.target.dataset.id;
            verfuegbareKisten = verfuegbareKisten.filter(k => k.id !== kistenId);
            aktualisiereKistenTypListenAnzeige();
            zeigeAppNachricht("Kistentyp entfernt.", "info");
        });
    });
}

// --- Produkt-Management ---
function produktHinzufuegen() {
    const name = produktNameEingabe.value.trim() || `Produkt ${produkteZuVerpacken.length + 1}`;
    const form = produktFormAuswahl.value;
    const anzahl = parseInt(produktAnzahlEingabe.value);
    const farbe = produktFarbeEingabe.value;
    const istZerbrechlich = produktIstZerbrechlichCheckbox.checked;
    const kannAnderesEnthalten = produktKannAnderesEnthaltenCheckbox.checked;
    const kannInAnderemPlatziertWerden = produktKannInAnderemPlatziertWerdenCheckbox.checked;
    
    let abmessungen = {};
    let istGueltig = true;

    if (form === 'box') {
        abmessungen.b = parseFloat(document.getElementById('produktBreite')?.value);
        abmessungen.h = parseFloat(document.getElementById('produktHoehe')?.value);
        abmessungen.t = parseFloat(document.getElementById('produktTiefe')?.value);
        if (isNaN(abmessungen.b) || isNaN(abmessungen.h) || isNaN(abmessungen.t) || abmessungen.b <= 0 || abmessungen.h <= 0 || abmessungen.t <= 0) istGueltig = false;
    } else if (form === 'cylinder') {
        abmessungen.radius = parseFloat(document.getElementById('produktRadius')?.value);
        abmessungen.hoehe = parseFloat(document.getElementById('produktZylinderHoehe')?.value);
        if (isNaN(abmessungen.radius) || isNaN(abmessungen.hoehe) || abmessungen.radius <= 0 || abmessungen.hoehe <= 0) istGueltig = false;
    } else if (form === 'sphere') {
        abmessungen.radius = parseFloat(document.getElementById('produktKugelRadius')?.value);
        if (isNaN(abmessungen.radius) || abmessungen.radius <= 0) istGueltig = false;
    }

    let innenvolumen = null;
    if (kannAnderesEnthalten) {
        const ivForm = innenvolumenFormAuswahl.value;
        let ivAbmessungen = {};
        if (ivForm === 'box') {
            ivAbmessungen.b = parseFloat(document.getElementById('innenvolumenBreite')?.value);
            ivAbmessungen.h = parseFloat(document.getElementById('innenvolumenHoehe')?.value);
            ivAbmessungen.t = parseFloat(document.getElementById('innenvolumenTiefe')?.value);
            if (isNaN(ivAbmessungen.b) || isNaN(ivAbmessungen.h) || isNaN(ivAbmessungen.t) || ivAbmessungen.b <= 0 || ivAbmessungen.h <= 0 || ivAbmessungen.t <= 0) istGueltig = false;
        } else if (ivForm === 'cylinder') {
            ivAbmessungen.radius = parseFloat(document.getElementById('innenvolumenRadius')?.value);
            ivAbmessungen.hoehe = parseFloat(document.getElementById('innenvolumenZylinderHoehe')?.value);
            if (isNaN(ivAbmessungen.radius) || isNaN(ivAbmessungen.hoehe) || ivAbmessungen.radius <= 0 || ivAbmessungen.hoehe <= 0) istGueltig = false;
        }
        if(istGueltig) innenvolumen = { form: ivForm, abmessungen: ivAbmessungen };
    }


    if (!istGueltig) { zeigeAppNachricht("Bitte geben Sie gültige positive Abmessungen für das Produkt und ggf. dessen Innenvolumen ein.", "error"); return; }
    if (isNaN(anzahl) || anzahl <= 0) { zeigeAppNachricht("Bitte geben Sie eine gültige positive Anzahl für das Produkt ein.", "error"); return; }

    for (let i = 0; i < anzahl; i++) {
        produkteZuVerpacken.push({
            id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${i}`,
            name: anzahl > 1 && produktNameEingabe.value.trim() ? `${name} #${i + 1}` : name,
            form: form, abmessungen: { ...abmessungen }, farbe: farbe,
            istZerbrechlich: istZerbrechlich,
            kannAnderesEnthalten: kannAnderesEnthalten,
            innenvolumen: innenvolumen ? { ...innenvolumen, abmessungen: {...innenvolumen.abmessungen} } : null, // Tiefe Kopie
            kannInAnderemPlatziertWerden: kannInAnderemPlatziertWerden
        });
    }
    aktualisiereProduktListenAnzeige();
    aktualisiereStatistikenAnzeige(); 
    produktAnzahlEingabe.value = 1; 
    produktFarbeEingabe.value = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')}`;
    validiereProduktAbmessungenLive(); 
}

function aktualisiereProduktListenAnzeige() {
    produktListeDiv.innerHTML = ''; 
    if (produkteZuVerpacken.length === 0) {
        produktListeDiv.innerHTML = '<p class="text-gray-500 italic">Noch keine Produkte hinzugefügt.</p>'; return;
    }
    produkteZuVerpacken.forEach((produkt) => {
        const produktEl = document.createElement('div');
        produktEl.className = 'p-3 bg-gray-50 rounded-md border border-gray-200 flex justify-between items-center text-sm';
        let abmessungsString = '';
        if (produkt.form === 'box') abmessungsString = `B:${produkt.abmessungen.b}, H:${produkt.abmessungen.h}, T:${produkt.abmessungen.t}`;
        else if (produkt.form === 'cylinder') abmessungsString = `R:${produkt.abmessungen.radius}, H:${produkt.abmessungen.hoehe}`;
        else if (produkt.form === 'sphere') abmessungsString = `R:${produkt.abmessungen.radius}`;
        
        let zusaetzlicheInfos = [];
        if(produkt.istZerbrechlich) zusaetzlicheInfos.push("Zerbrechlich");
        if(produkt.kannAnderesEnthalten) zusaetzlicheInfos.push("Behälter");
        if(produkt.kannInAnderemPlatziertWerden) zusaetzlicheInfos.push("Verschachtelbar");

        produktEl.innerHTML = `
            <div class="flex items-center">
                <span style="width: 18px; height: 18px; background-color: ${produkt.farbe}; border-radius: ${produkt.form === 'sphere' ? '50%' : '3px'}; margin-right: 8px; border: 1px solid #ccc;"></span>
                <span>${produkt.name} (${produkt.form.charAt(0).toUpperCase() + produkt.form.slice(1)}, ${abmessungsString} cm) ${zusaetzlicheInfos.length > 0 ? '<span class="text-xs text-gray-500 ml-1">(' + zusaetzlicheInfos.join(', ') + ')</span>' : ''}</span>
            </div>
            <button data-id="${produkt.id}" class="entferne-produkt-knopf text-red-500 hover:text-red-700 font-medium">Entfernen</button>`;
        produktListeDiv.appendChild(produktEl);
    });
    document.querySelectorAll('.entferne-produkt-knopf').forEach(knopf => {
        knopf.addEventListener('click', (e) => {
            const produktId = e.target.dataset.id;
            produkteZuVerpacken = produkteZuVerpacken.filter(p => p.id !== produktId);
            aktualisiereProduktListenAnzeige();
            aktualisiereStatistikenAnzeige(); 
        });
    });
}

// --- Three.js Initialisierung und Szene ---
function initialisiereThreeJS() {
    szene = new THREE.Scene();
    szene.background = new THREE.Color(0xf0f0f0);

    const leinwand = document.getElementById('visualisierungsLeinwand');
    kamera = new THREE.PerspectiveCamera(75, leinwand.clientWidth / leinwand.clientHeight, 0.1, 1000);
    kamera.position.set(aktuelleAnzeigeKistenAbmessungen.b * 0.9, aktuelleAnzeigeKistenAbmessungen.h * 1.4, aktuelleAnzeigeKistenAbmessungen.t * 3);
    kamera.lookAt(aktuelleAnzeigeKistenAbmessungen.b / 2, aktuelleAnzeigeKistenAbmessungen.h / 2, aktuelleAnzeigeKistenAbmessungen.t / 2);

    renderer = new THREE.WebGLRenderer({ canvas: leinwand, antialias: true });
    renderer.setSize(leinwand.clientWidth, leinwand.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    const umgebungslicht = new THREE.AmbientLight(0xffffff, 0.6);
    szene.add(umgebungslicht);
    const direktionalesLicht = new THREE.DirectionalLight(0xffffff, 0.9);
    direktionalesLicht.position.set(20, 30, 25);
    direktionalesLicht.castShadow = true;
    szene.add(direktionalesLicht);
    
    const bodenGeo = new THREE.PlaneGeometry(200, 200);
    const bodenMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8, metalness: 0.2 });
    const boden = new THREE.Mesh(bodenGeo, bodenMat);
    boden.rotation.x = -Math.PI / 2;
    boden.position.y = -0.05; 
    boden.receiveShadow = true;
    szene.add(boden);

    orbitSteuerung = new OrbitControls(kamera, renderer.domElement);
    orbitSteuerung.target.set(aktuelleAnzeigeKistenAbmessungen.b / 2, aktuelleAnzeigeKistenAbmessungen.h / 2, aktuelleAnzeigeKistenAbmessungen.t / 2);
    orbitSteuerung.enableDamping = true;
    orbitSteuerung.dampingFactor = 0.05;
    orbitSteuerung.minDistance = 5;
    orbitSteuerung.maxDistance = 200; // Erhöht für größere Kisten
    orbitSteuerung.maxPolarAngle = Math.PI / 1.8;

    zeichneHauptKistenUmriss(aktuelleAnzeigeKistenAbmessungen);
    animieren();
}

function setupGlobaleEventlistener() {
    kistenTypHinzufuegenKnopf.addEventListener('click', kistenTypHinzufuegen);
    produktHinzufuegenKnopf.addEventListener('click', produktHinzufuegen);
    optimaleKisteFindenKnopf.addEventListener('click', findeOptimaleKisteUndVerpacke);
    allesZuruecksetzenKnopf.addEventListener('click', allesZuruecksetzen);
    window.addEventListener('resize', beiFensterGroessenaenderung, false);
    produktFormAuswahl.addEventListener('change', aktualisiereProduktAbmessungsEingaben);
    
    produktKannAnderesEnthaltenCheckbox.addEventListener('change', (e) => {
        innenvolumenOptionenContainer.classList.toggle('hidden', !e.target.checked);
        if(e.target.checked) aktualisiereInnenvolumenAbmessungsEingaben();
    });
    innenvolumenFormAuswahl.addEventListener('change', aktualisiereInnenvolumenAbmessungsEingaben);
}

function beiFensterGroessenaenderung() {
    const leinwand = document.getElementById('visualisierungsLeinwand');
    const container = document.getElementById('visualisierungsContainer');
    if (!container || !leinwand) return;
    const neueBreite = container.clientWidth;
    const neueHoehe = 500; 
    if (kamera && renderer) {
        kamera.aspect = neueBreite / neueHoehe;
        kamera.updateProjectionMatrix();
        renderer.setSize(neueBreite, neueHoehe);
    }
}

let hauptKistenUmrissMesh = null; 
function zeichneHauptKistenUmriss(kistenAbm) {
    if(hauptKistenUmrissMesh) szene.remove(hauptKistenUmrissMesh);
    const geometrie = new THREE.BoxGeometry(kistenAbm.b, kistenAbm.h, kistenAbm.t);
    const kanten = new THREE.EdgesGeometry(geometrie);
    const linienMaterial = new THREE.LineBasicMaterial({ color: 0x1a202c, linewidth: 2 });
    hauptKistenUmrissMesh = new THREE.LineSegments(kanten, linienMaterial);
    hauptKistenUmrissMesh.position.set(kistenAbm.b / 2, kistenAbm.h / 2, kistenAbm.t / 2);
    szene.add(hauptKistenUmrissMesh);
}

function animieren() {
    requestAnimationFrame(animieren);
    orbitSteuerung.update();
    renderer.render(szene, kamera);
}

function entferneVerpackteObjektMeshesAusSzene() {
    verpackteObjektMeshes.forEach(meshGruppe => { 
        if(meshGruppe.formMesh) szene.remove(meshGruppe.formMesh);
        if(meshGruppe.kantenMesh) szene.remove(meshGruppe.kantenMesh);
    });
    verpackteObjektMeshes = [];
}

// --- Kern Packlogik (für eine einzelne Kiste) ---
// Gibt Array von Orientierungen zurück: { name, effektiveB, effektiveH, effektiveT, rotation, originalFormParameter }
function getProduktOrientierungen(produkt) { 
    const { form, abmessungen } = produkt;
    let orientierungen = [];
    if (form === 'box') {
        const { b, h, t } = abmessungen;
        orientierungen = [ { name: 'BHT', effektiveB: b, effektiveH: h, effektiveT: t, rotation: new THREE.Euler(0, 0, 0), originalFormParameter: abmessungen }, { name: 'BTH', effektiveB: b, effektiveH: t, effektiveT: h, rotation: new THREE.Euler(Math.PI / 2, 0, 0), originalFormParameter: abmessungen }, { name: 'TBH', effektiveB: t, effektiveH: h, effektiveT: b, rotation: new THREE.Euler(0, Math.PI / 2, 0), originalFormParameter: abmessungen }, { name: 'HBT', effektiveB: h, effektiveH: b, effektiveT: t, rotation: new THREE.Euler(0, 0, Math.PI / 2), originalFormParameter: abmessungen }, { name: 'HTB', effektiveB: h, effektiveH: t, effektiveT: b, rotation: new THREE.Euler(Math.PI / 2, 0, Math.PI / 2), originalFormParameter: abmessungen }, { name: 'THB', effektiveB: t, effektiveH: b, effektiveT: h, rotation: new THREE.Euler(0, Math.PI / 2, Math.PI / 2), originalFormParameter: abmessungen }];
    } else if (form === 'cylinder') {
        const { radius, hoehe } = abmessungen; const durchmesser = 2 * radius;
        orientierungen.push({ name: 'Stehend', effektiveB: durchmesser, effektiveH: hoehe, effektiveT: durchmesser, rotation: new THREE.Euler(0, 0, 0), originalFormParameter: abmessungen }); // Y-Achse
        orientierungen.push({ name: 'LiegendX', effektiveB: hoehe, effektiveH: durchmesser, effektiveT: durchmesser, rotation: new THREE.Euler(0, 0, Math.PI / 2), originalFormParameter: abmessungen }); // Entlang X
        orientierungen.push({ name: 'LiegendZ', effektiveB: durchmesser, effektiveH: durchmesser, effektiveT: hoehe, rotation: new THREE.Euler(Math.PI / 2, 0, 0), originalFormParameter: abmessungen }); // Entlang Z
    } else if (form === 'sphere') {
        const { radius } = abmessungen; const durchmesser = 2 * radius;
        orientierungen.push({ name: 'Standard', effektiveB: durchmesser, effektiveH: durchmesser, effektiveT: durchmesser, rotation: new THREE.Euler(0, 0, 0), originalFormParameter: abmessungen });
    }
    return orientierungen;
}

// Prüft, ob produktOrientierung an pos in zielKiste platziert werden kann, unter Berücksichtigung von existierendenObjekten und Zerbrechlichkeit
function kannPlatziertWerden(produktOrientierung, pos, zielKisteAbm, existierendeObjekte, istZerbrechlichPruefungAktiv = true) {
    const epsilon = 0.01; // Toleranz für Fließkommavergleiche und kleine Lücken
    
    // Kistengrenzen prüfen
    if (pos.x < -epsilon || pos.y < -epsilon || pos.z < -epsilon ||
        pos.x + produktOrientierung.effektiveB > zielKisteAbm.b + epsilon ||
        pos.y + produktOrientierung.effektiveH > zielKisteAbm.h + epsilon ||
        pos.z + produktOrientierung.effektiveT > zielKisteAbm.t + epsilon) {
        return false;
    }

    // Kollision mit existierenden Objekten prüfen
    for (const item of existierendeObjekte) {
        const p = produktOrientierung; // Aktuell zu platzierendes Produkt
        // AABB Kollisionscheck
        if (pos.x < item.x + item.b - epsilon && pos.x + p.effektiveB > item.x + epsilon &&
            pos.y < item.y + item.h - epsilon && pos.y + p.effektiveH > item.y + epsilon &&
            pos.z < item.z + item.t - epsilon && pos.z + p.effektiveT > item.z + epsilon) {
            return false; // Kollision
        }

        // Zerbrechlichkeitsprüfung (wenn aktiv)
        if (istZerbrechlichPruefungAktiv && item.istZerbrechlich) {
            // Prüfen, ob das neue Produkt (p) direkt auf dem zerbrechlichen item platziert wird
            const istObenDrauf = 
                Math.abs(pos.y - (item.y + item.h)) < epsilon && // p's Unterseite ist auf item's Oberseite
                pos.x < item.x + item.b - epsilon && pos.x + p.effektiveB > item.x + epsilon && // X-Überlappung
                pos.z < item.z + item.t - epsilon && pos.z + p.effektiveT > item.z + epsilon;   // Z-Überlappung
            if (istObenDrauf) {
                return false; // Darf nicht auf zerbrechlichem Item platziert werden
            }
        }
    }
    return true;
}

// Hauptfunktion zum Verpacken von Produkten in eine spezifische Kiste
function verpackeProdukteInSpezifischeKiste(kisteZumVerpacken, alleZuVerpackendenProdukte) {
    let direktVerpackteItems = []; // Items direkt in kisteZumVerpacken
    let verschachtelteItemsGlobal = []; // Items, die in anderen Items verschachtelt sind
    
    // Kopie für diese Packoperation, sortiert nach AABB-Volumen (größte zuerst)
    let nochZuVerpackendeProdukte = [...alleZuVerpackendenProdukte].sort((a, b) => {
        const volA = getProduktOrientierungen(a)[0]; 
        const volB = getProduktOrientierungen(b)[0];
        return (volB.effektiveB * volB.effektiveH * volB.effektiveT) - 
               (volA.effektiveB * volA.effektiveH * volA.effektiveT);
    });

    // Pass 1: Haupt-Kistenverpackung
    let temporaerNochZuVerpacken = [...nochZuVerpackendeProdukte];
    nochZuVerpackendeProdukte = []; // Wird neu befüllt mit denen, die nicht passten

    for (const produkt of temporaerNochZuVerpacken) {
        let bestePlatzierung = null; 
        sucheSchleife:
        for (let y = 0; y < kisteZumVerpacken.h; y += 0.5) { // Von unten nach oben
            for (let z = 0; z < kisteZumVerpacken.t; z += 0.5) { // Von hinten nach vorne
                for (let x = 0; x < kisteZumVerpacken.b; x += 0.5) { // Von links nach rechts
                    const aktuellePos = { x, y, z };
                    const orientierungen = getProduktOrientierungen(produkt);
                    for (const orientierung of orientierungen) {
                        if (kannPlatziertWerden(orientierung, aktuellePos, kisteZumVerpacken, direktVerpackteItems)) {
                            bestePlatzierung = { orientierung, position: aktuellePos, produktOriginal: produkt };
                            break sucheSchleife; 
                        }
                    }
                }
            }
        }

        if (bestePlatzierung) {
            const {orientierung, position, produktOriginal} = bestePlatzierung;
            direktVerpackteItems.push({
                ...produktOriginal, // Kopiert alle Eigenschaften wie id, name, form, abmessungen, farbe, istZerbrechlich etc.
                x: position.x, y: position.y, z: position.z, 
                b: orientierung.effektiveB, h: orientierung.effektiveH, t: orientierung.effektiveT, 
                rotation: orientierung.rotation,
                originalFormParameter: orientierung.originalFormParameter, // Wichtig für Rendering & Volumen
                verpacktInId: null // Direkt in der Kiste
            });
        } else {
            nochZuVerpackendeProdukte.push(produkt); // Konnte nicht platziert werden
        }
    }

    // Pass 2: Verschachtelungsversuch
    let uebrigNachHauptverpackung = [...nochZuVerpackendeProdukte]; // Items, die nicht in die Hauptkiste passten
    nochZuVerpackendeProdukte = []; // Reset für die, die auch nicht verschachtelt werden konnten

    for (const behaelterItem of direktVerpackteItems) {
        if (!behaelterItem.kannAnderesEnthalten || !behaelterItem.innenvolumen) continue;

        // Definiere den Hohlraum als eine "Mini-Kiste"
        // Position des Hohlraums ist relativ zum BehälterItem, dann transformiert in Weltkoordinaten.
        // Für Einfachheit: Wir nehmen an, das Innenvolumen ist zentriert im BehälterItem für AABB-Zwecke.
        // Die Rotation des Behälters bestimmt die Orientierung des Innenvolumens.
        
        const ivAbm = behaelterItem.innenvolumen.abmessungen;
        let hohlraumAbm = {b:0, h:0, t:0}; // Effektive BHT des Hohlraums nach Rotation des Behälters
        
        // TODO: Komplexere Berechnung der Hohlraum-AABB basierend auf Behälterrotation und Innenvolumenform.
        // Fürs Erste nehmen wir an, die Innenvolumen-AABB-Dimensionen sind direkt gegeben oder einfach ableitbar.
        // Beispiel: Zylindrisches Innenvolumen in einem stehenden Zylinder-Behälter.
        if (behaelterItem.innenvolumen.form === 'cylinder') {
            hohlraumAbm = { b: ivAbm.radius * 2, h: ivAbm.hoehe, t: ivAbm.radius * 2}; // Annahme: Steht aufrecht im Behälter
        } else { // box
            hohlraumAbm = { b: ivAbm.b, h: ivAbm.h, t: ivAbm.t };
        }
        // Die Position des Hohlraums (dessen 0,0,0 Punkt) muss relativ zur Behälterposition sein.
        // Dies ist der schwierigste Teil für eine genaue Verschachtelung.
        // Vereinfachung: Wir packen in einen konzeptuellen Raum der Größe hohlraumAbm.
        // Die tatsächliche Positionierung der verschachtelten Meshes erfolgt später relativ zum Behälter.

        let aktuellInDiesemBehaelterVerschachtelt = [];
        let temporaerFuerDiesenBehaelterUebrig = [...uebrigNachHauptverpackung];
        uebrigNachHauptverpackung = []; 

        for (const produktZumVerschachteln of temporaerFuerDiesenBehaelterUebrig) {
            if (!produktZumVerschachteln.kannInAnderemPlatziertWerden) {
                uebrigNachHauptverpackung.push(produktZumVerschachteln);
                continue;
            }
            
            let besteVerschachtelungsPlatzierung = null;
            // Hier packen wir in den relativen Raum des Hohlraums (Ursprung 0,0,0)
            // Die Zerbrechlichkeitsprüfung gilt auch innerhalb des Hohlraums.
            // `kannPlatziertWerden` braucht die Dimensionen des Hohlraums.
            // Die `existierendeObjekte` sind `aktuellInDiesemBehaelterVerschachtelt`.
            
            // TODO: Die `kannPlatziertWerden` Logik für Hohlräume muss die Transformationen beachten.
            // Für diese Version: Wir nehmen an, der Hohlraum ist eine AABB und wir packen darin.
            // Die Zerbrechlichkeitsprüfung ist relativ zu den Items im Hohlraum.

            // Vereinfachte Suche im Hohlraum (0,0,0 als Start)
            sucheHohlraumSchleife:
            for (let y_iv = 0; y_iv < hohlraumAbm.h; y_iv += 0.5) {
                for (let z_iv = 0; z_iv < hohlraumAbm.t; z_iv += 0.5) {
                    for (let x_iv = 0; x_iv < hohlraumAbm.b; x_iv += 0.5) {
                        const aktuellePosImHohlraum = { x: x_iv, y: y_iv, z: z_iv };
                        const orientierungen = getProduktOrientierungen(produktZumVerschachteln);
                        for (const orientierung of orientierungen) {
                            if (kannPlatziertWerden(orientierung, aktuellePosImHohlraum, hohlraumAbm, aktuellInDiesemBehaelterVerschachtelt, true)) {
                                 besteVerschachtelungsPlatzierung = { orientierung, position: aktuellePosImHohlraum, produktOriginal: produktZumVerschachteln };
                                 break sucheHohlraumSchleife;
                            }
                        }
                    }
                }
            }

            if (besteVerschachtelungsPlatzierung) {
                const {orientierung, position, produktOriginal} = besteVerschachtelungsPlatzierung;
                const verschachteltesDetail = {
                    ...produktOriginal,
                    // Position ist relativ zum Hohlraum-Ursprung. Muss später transformiert werden.
                    x_relativ: position.x, y_relativ: position.y, z_relativ: position.z,
                    b: orientierung.effektiveB, h: orientierung.effektiveH, t: orientierung.effektiveT, 
                    rotation: orientierung.rotation,
                    originalFormParameter: orientierung.originalFormParameter,
                    verpacktInId: behaelterItem.id 
                };
                aktuellInDiesemBehaelterVerschachtelt.push(verschachteltesDetail);
                verschachtelteItemsGlobal.push(verschachteltesDetail); 
            } else {
                uebrigNachHauptverpackung.push(produktZumVerschachteln);
            }
        }
         // uebrigNachHauptverpackung enthält nun die Items, die weder in die Hauptkiste noch in diesen Behälter passten.
         // Für den nächsten Behälter wird diese Liste weiter verwendet.
    }
    nochZuVerpackendeProdukte = uebrigNachHauptverpackung; // Was am Ende aller Nesting-Versuche übrig bleibt.


    // Ergebnisse berechnen
    let gesamtVerpacktesProduktVolumen = 0;
    direktVerpackteItems.forEach(item => gesamtVerpacktesProduktVolumen += berechneProduktVolumen(item));
    verschachtelteItemsGlobal.forEach(item => gesamtVerpacktesProduktVolumen += berechneProduktVolumen(item));
    
    const kistenVolumen = kisteZumVerpacken.b * kisteZumVerpacken.h * kisteZumVerpacken.t;
    const effizienz = kistenVolumen > 0 ? (gesamtVerpacktesProduktVolumen / kistenVolumen) * 100 : 0;
    const anzahlVerpackt = direktVerpackteItems.length + verschachtelteItemsGlobal.length;

    return {
        verwendeteKiste: kisteZumVerpacken,
        direktVerpackteItemsListe: direktVerpackteItems,
        verschachtelteItemsListe: verschachtelteItemsGlobal,
        anzahlVerpackt: anzahlVerpackt,
        gesamtProduktVolumen: gesamtVerpacktesProduktVolumen,
        effizienz: effizienz,
        nichtVerpackteItems: nochZuVerpackendeProdukte // Wichtig für Feedback
    };
}

function berechneProduktVolumen(produkt) { // Nimmt ein Produkt-Objekt mit originalFormParameter
    if (!produkt.originalFormParameter) return 0;
    const p = produkt.originalFormParameter;
    if (produkt.form === 'box') return p.b * p.h * p.t;
    if (produkt.form === 'cylinder') return Math.PI * Math.pow(p.radius, 2) * p.hoehe;
    if (produkt.form === 'sphere') return (4/3) * Math.PI * Math.pow(p.radius, 3);
    return 0;
}

// --- Optimale Kistenauswahl und Pack-Orchestrierung ---
function findeOptimaleKisteUndVerpacke() {
    if (verfuegbareKisten.length === 0) { zeigeAppNachricht("Bitte definieren Sie zuerst mindestens einen Kistentyp.", "error"); return; }
    if (produkteZuVerpacken.length === 0) { zeigeAppNachricht("Bitte fügen Sie zuerst mindestens ein Produkt zum Verpacken hinzu.", "error"); return; }

    entferneVerpackteObjektMeshesAusSzene(); 
    let bestesPackErgebnis = null;

    verfuegbareKisten.forEach(kistenDef => {
        const aktuellerVersuch = verpackeProdukteInSpezifischeKiste(kistenDef, produkteZuVerpacken);
        console.log(`Versuch mit Kiste ${kistenDef.name}: Effizienz ${aktuellerVersuch.effizienz.toFixed(2)}%, Verpackt ${aktuellerVersuch.anzahlVerpackt}/${produkteZuVerpacken.length}. Nicht verpackt: ${aktuellerVersuch.nichtVerpackteItems.length}`);

        if (!bestesPackErgebnis || aktuellerVersuch.effizienz > bestesPackErgebnis.effizienz) {
            bestesPackErgebnis = aktuellerVersuch;
        } else if (aktuellerVersuch.effizienz === bestesPackErgebnis.effizienz) {
            if (aktuellerVersuch.anzahlVerpackt > bestesPackErgebnis.anzahlVerpackt) {
                bestesPackErgebnis = aktuellerVersuch;
            } else if (aktuellerVersuch.anzahlVerpackt === bestesPackErgebnis.anzahlVerpackt) {
                const aktuellesKistenVol = aktuellerVersuch.verwendeteKiste.b * aktuellerVersuch.verwendeteKiste.h * aktuellerVersuch.verwendeteKiste.t;
                const bestesKistenVol = bestesPackErgebnis.verwendeteKiste.b * bestesPackErgebnis.verwendeteKiste.h * bestesPackErgebnis.verwendeteKiste.t;
                if (aktuellesKistenVol < bestesKistenVol) bestesPackErgebnis = aktuellerVersuch;
            }
        }
    });

    if (bestesPackErgebnis && bestesPackErgebnis.anzahlVerpackt > 0) {
        aktuelleAnzeigeKistenAbmessungen = { ...bestesPackErgebnis.verwendeteKiste };
        
        ausgewaehlterKistenNameUI.textContent = bestesPackErgebnis.verwendeteKiste.name;
        ausgewaehlteKistenBreiteUI.textContent = bestesPackErgebnis.verwendeteKiste.b.toFixed(1);
        ausgewaehlteKistenHoeheUI.textContent = bestesPackErgebnis.verwendeteKiste.h.toFixed(1);
        ausgewaehlteKistenTiefeUI.textContent = bestesPackErgebnis.verwendeteKiste.t.toFixed(1);

        zeichneHauptKistenUmriss(aktuelleAnzeigeKistenAbmessungen);
        visualisiereVerpackteItems(bestesPackErgebnis.direktVerpackteItemsListe, bestesPackErgebnis.verschachtelteItemsListe, bestesPackErgebnis.verwendeteKiste);
        aktualisiereStatistikenAnzeige(bestesPackErgebnis);

        kamera.position.set(aktuelleAnzeigeKistenAbmessungen.b * 0.9, aktuelleAnzeigeKistenAbmessungen.h * 1.4, aktuelleAnzeigeKistenAbmessungen.t * 3);
        kamera.lookAt(aktuelleAnzeigeKistenAbmessungen.b / 2, aktuelleAnzeigeKistenAbmessungen.h / 2, aktuelleAnzeigeKistenAbmessungen.t / 2);
        orbitSteuerung.target.set(aktuelleAnzeigeKistenAbmessungen.b / 2, aktuelleAnzeigeKistenAbmessungen.h / 2, aktuelleAnzeigeKistenAbmessungen.t / 2);
        orbitSteuerung.update();

        let nachricht = `Optimale Kiste: "${bestesPackErgebnis.verwendeteKiste.name}" mit ${bestesPackErgebnis.effizienz.toFixed(2)}% Effizienz. ${bestesPackErgebnis.anzahlVerpackt} von ${produkteZuVerpacken.length} Produkten verpackt.`;
        if(bestesPackErgebnis.nichtVerpackteItems.length > 0) {
            nachricht += ` ${bestesPackErgebnis.nichtVerpackteItems.length} Produkte konnten nicht verpackt werden.`
        }
        zeigeAppNachricht(nachricht, "info", 10000);

    } else {
        zeigeAppNachricht("Es konnten keine Produkte in eine der definierten Kisten verpackt werden oder es wurde keine geeignete Verpackung gefunden.", "warning");
        aktuelleAnzeigeKistenAbmessungen = {b:20, h:15, t:10}; 
        zeichneHauptKistenUmriss(aktuelleAnzeigeKistenAbmessungen);
        aktualisiereStatistikenAnzeige(null);
    }
}

function visualisiereVerpackteItems(direktVerpackte, verschachtelte, hauptKiste) {
    // Helferfunktion, um ein einzelnes Item-Mesh zu erstellen
    const erstelleItemMesh = (item, istVerschachtelt = false, behaelterItem = null) => {
        let geometrie;
        const { form, originalFormParameter, farbe, rotation, x, y, z, b, h, t } = item; // b,h,t sind AABB Dims
        const { x_relativ, y_relativ, z_relativ } = item; // Für verschachtelte Items

        if (form === 'box') geometrie = new THREE.BoxGeometry(originalFormParameter.b, originalFormParameter.h, originalFormParameter.t);
        else if (form === 'cylinder') geometrie = new THREE.CylinderGeometry(originalFormParameter.radius, originalFormParameter.radius, originalFormParameter.hoehe, 32);
        else if (form === 'sphere') geometrie = new THREE.SphereGeometry(originalFormParameter.radius, 32, 32);
        else return null;

        const material = new THREE.MeshStandardMaterial({ color: farbe, transparent: true, opacity: 0.9, roughness: 0.4, metalness: 0.1 });
        const mesh = new THREE.Mesh(geometrie, material);
        mesh.castShadow = true; 
        mesh.receiveShadow = true;
        mesh.rotation.copy(rotation);

        if (istVerschachtelt && behaelterItem) {
            // Positioniere relativ zum Behälter-Mesh-Zentrum, dann addiere relative Position im Hohlraum
            // Dies ist eine Vereinfachung. Eine exakte Positionierung des verschachtelten Items
            // erfordert die genaue Kenntnis des Hohlraum-Ursprungs relativ zum Behälter-Mesh-Ursprung.
            // Annahme: Behälter-Mesh ist bei behaelterItem.x + behaelterItem.b/2 etc. zentriert.
            // Annahme: Hohlraum-Ursprung ist (vereinfacht) in der unteren linken vorderen Ecke des Behälter-Innen-AABB.
            
            // Position des Behälters (Zentrum des AABB)
            const behaelterZentrumX = behaelterItem.x + behaelterItem.b / 2;
            const behaelterZentrumY = behaelterItem.y + behaelterItem.h / 2;
            const behaelterZentrumZ = behaelterItem.z + behaelterItem.t / 2;

            // TODO: Diese Positionierung für verschachtelte Items muss noch präzisiert werden,
            // basierend auf der tatsächlichen Geometrie und Rotation des Behälters und seines Innenvolumens.
            // Fürs Erste: positioniere es relativ zum AABB-Start des Behälters, plus relative Position im Hohlraum.
            mesh.position.set(
                behaelterItem.x + x_relativ + b / 2, // b,h,t hier sind vom verschachtelten Item
                behaelterItem.y + y_relativ + h / 2,
                behaelterItem.z + z_relativ + t / 2
            );
             // Wichtig: Die Rotation des Behälters muss auch auf das verschachtelte Item angewendet werden,
             // wenn die relative Position im Hohlraum in einem unrotierten System definiert wurde.
             // Oder, die relative Position ist bereits im rotierten System des Behälters.
             // Hier nehmen wir an, die Rotation des verschachtelten Items ist bereits absolut.

        } else { // Direkt verpackt
            mesh.position.set(x + b / 2, y + h / 2, z + t / 2); // b,h,t sind AABB Dims
        }
        
        szene.add(mesh);

        const kanten = new THREE.EdgesGeometry(mesh.geometry);
        const kantenMaterial = new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 1, transparent: true, opacity: 0.3 });
        const itemKanten = new THREE.LineSegments(kanten, kantenMaterial);
        itemKanten.rotation.copy(mesh.rotation); 
        itemKanten.position.copy(mesh.position); 
        szene.add(itemKanten);
        return {formMesh: mesh, kantenMesh: itemKanten};
    };

    direktVerpackte.forEach(item => {
        const meshes = erstelleItemMesh(item, false);
        if(meshes) verpackteObjektMeshes.push(meshes);
    });

    verschachtelte.forEach(item => {
        const behaelter = direktVerpackte.find(d => d.id === item.verpacktInId);
        if (behaelter) {
            const meshes = erstelleItemMesh(item, true, behaelter);
            if(meshes) verpackteObjektMeshes.push(meshes);
        } else {
            console.warn("Behälter für verschachteltes Item nicht gefunden:", item.verpacktInId);
        }
    });
}


function aktualisiereStatistikenAnzeige(packErgebnis = null) {
    statAnzahlProdukteZuVerpacken.textContent = produkteZuVerpacken.length;
    if (packErgebnis && packErgebnis.verwendeteKiste) {
        const kistenVol = packErgebnis.verwendeteKiste.b * packErgebnis.verwendeteKiste.h * packErgebnis.verwendeteKiste.t;
        statKistenVolumen.textContent = kistenVol.toFixed(2) + " cm³";
        statAnzahlVerpackteProdukte.textContent = packErgebnis.anzahlVerpackt;
        statVerpacktesVolumen.textContent = packErgebnis.gesamtProduktVolumen.toFixed(2) + " cm³";
        statEffizienz.textContent = packErgebnis.effizienz.toFixed(2) + "%";

        ausgewaehlterKistenNameUI.textContent = packErgebnis.verwendeteKiste.name;
        ausgewaehlteKistenBreiteUI.textContent = packErgebnis.verwendeteKiste.b.toFixed(1);
        ausgewaehlteKistenHoeheUI.textContent = packErgebnis.verwendeteKiste.h.toFixed(1);
        ausgewaehlteKistenTiefeUI.textContent = packErgebnis.verwendeteKiste.t.toFixed(1);

    } else { 
        statKistenVolumen.textContent = "0 cm³";
        statAnzahlVerpackteProdukte.textContent = "0";
        statVerpacktesVolumen.textContent = "0 cm³";
        statEffizienz.textContent = "0%";
        ausgewaehlterKistenNameUI.textContent = "N/A";
        ausgewaehlteKistenBreiteUI.textContent = "0";
        ausgewaehlteKistenHoeheUI.textContent = "0";
        ausgewaehlteKistenTiefeUI.textContent = "0";
    }
}

function allesZuruecksetzen() {
    verfuegbareKisten = [];
    produkteZuVerpacken = [];
    entferneVerpackteObjektMeshesAusSzene();
    
    aktualisiereKistenTypListenAnzeige();
    aktualisiereProduktListenAnzeige();
    
    aktuelleAnzeigeKistenAbmessungen = { b: 20, h: 15, t: 10 }; 
    zeichneHauptKistenUmriss(aktuelleAnzeigeKistenAbmessungen);
    aktualisiereStatistikenAnzeige(null);

    kistenTypNameEingabe.value = '';
    produktNameEingabe.value = '';
    produktAnzahlEingabe.value = 1;
    produktFormAuswahl.value = 'box';
    produktIstZerbrechlichCheckbox.checked = false;
    produktKannAnderesEnthaltenCheckbox.checked = false;
    innenvolumenOptionenContainer.classList.add('hidden');
    produktKannInAnderemPlatziertWerdenCheckbox.checked = false;

    aktualisiereProduktAbmessungsEingaben(); 
    validiereProduktAbmessungenLive(); 
    
    zeigeAppNachricht("Alle Definitionen, Produkte und Visualisierungen wurden zurückgesetzt.", "info");
}

// --- Initialer Setup ---
document.addEventListener('DOMContentLoaded', () => {
    initialisiereThreeJS();
    setupGlobaleEventlistener();
    aktualisiereProduktAbmessungsEingaben(); 
    aktualisiereInnenvolumenAbmessungsEingaben(); // Für den Fall, dass Standard 'cylinder' ist
    aktualisiereKistenTypListenAnzeige(); 
    aktualisiereProduktListenAnzeige(); 
    aktualisiereStatistikenAnzeige(); 
    beiFensterGroessenaenderung();
});