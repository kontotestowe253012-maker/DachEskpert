import { useMemo, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Plus, Trash2, RotateCw, Zap, X, Download } from 'lucide-react';
import jsPDF from 'jspdf';

interface SheetPart {
  id: string;
  name: string;
  width: number;
  length: number;
  quantity: number;
  closureType?: 'normal' | 'one-side' | 'two-side';
  closureLength?: number;
}

interface Sheet {
  width: number;
  length: number;
}

interface LayoutResult {
  parts: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    quantity: number;
    rotated?: boolean;
  }>;
  totalWaste: number;
  wastePercent: number;
  fitsAll: boolean;
  usedLength: number;
  usedWidth: number;
  wasteWidth: number;
}

interface OrientationResult {
  horizontal: LayoutResult;
  vertical: LayoutResult;
  recommended: 'horizontal' | 'vertical';
}

const SHEET_TYPES = {
  standard: { name: 'Standardowy', width: 125, length: 200 },
  narrow: { name: 'Wąski', width: 100, length: 200 },
  large: { name: 'Duży', width: 150, length: 200 },
  roll: { name: 'Blacha z rolki', width: 0, length: 0, isRoll: true },
};

const PROCESSING_TYPES = [
  { id: 'pas_nadrynnowy', name: 'Pas nadrynnowy (okapowy)', width: 21, length: 200, icon: '📏', hasClosureOptions: false },
  { id: 'pas', name: 'Pas podrynnowy', width: 21, length: 200, icon: '📏', hasClosureOptions: false },
  { id: 'wiatrownica', name: 'Wiatrownica (górna/boczna)', width: 31, length: 200, icon: '🌬️', hasClosureOptions: false },
  { id: 'gasior', name: 'Gąsior (obróbka kalenicy)', width: 31, length: 200, icon: '💧', hasClosureOptions: false },
  { id: 'parapet', name: 'Parapet', width: 25, length: 200, icon: '🪟', hasClosureOptions: true },
  { id: 'rynna', name: 'Rynna koszowa (kosz)', width: 56, length: 200, icon: '🪣', hasClosureOptions: false },
  { id: 'kominek', name: 'Obróbka komina', width: 40, length: 200, icon: '🔥', hasClosureOptions: false },
  { id: 'obrobka', name: 'Obróbka przyścienna', width: 22, length: 200, icon: '🔧', hasClosureOptions: false },
  { id: 'ogniomur', name: 'Obróbka ogniomuru (czapa)', width: 40, length: 200, icon: '🏗️', hasClosureOptions: false },
  { id: 'listwa_dociskowa', name: 'Listwa dociskowa', width: 10, length: 200, icon: '📐', hasClosureOptions: false },
];

const COLORS = [
  'RAL 7016 (Antracyt)',
  'RAL 9005 (Czarny)',
  'RAL 8017 (Brązowy)',
  'RAL 7024 (Grafit)',
  'RAL 8004 (Ceglasty)',
  'RAL 8019 (Ciemnobrązowy)',
  'RAL 7021 (Ciemny antracyt)',
  'RAL 3009 (Wiśniowy)',
  'RAL 6020 (Zielony)',
  'RAL 9006 (Srebrny jasny)',
  'RAL 9007 (Srebrny ciemny)',
  'RAL 9010 (Biały)',
  'RAL 9002 (Biało-szary)',
  'Sierra Tan (Beżowy)',
  'Atlantic Sand (Jasnoszary)',
  'Ocynk (Naturalny srebrny)',
  'Alucynk (Srebrny matowy)',
  'Tytan-Cynk Naturalny',
  'Tytan-Cynk Patyna Szara',
  'Tytan-Cynk Patyna Grafitowa',
  'Aluminium Naturalne',
  'Aluminium Powlekane (RAL 7016)',
  'Aluminium Powlekane (RAL 8017)',
  'Aluminium Powlekane (RAL 9005)',
  'Stal Nierdzewna Lustro (BA)',
  'Stal Nierdzewna Szlifowana (4N)',
  'Stal Nierdzewna Matowa (2B)',
];

const THICKNESSES = ['0.5mm', '0.7mm', '1.0mm', '1.25mm', '1.5mm', '2.0mm'];

export default function Home() {
  const [parts, setParts] = useState<SheetPart[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [sheetsCount, setSheetsCount] = useState<number>(1);
  const [selectedSheet, setSelectedSheet] = useState<'standard' | 'narrow' | 'large' | 'roll'>('standard');
  const [rollWidth, setRollWidth] = useState<number>(125);
  const [rollLength, setRollLength] = useState<number>(10);
  const [selectedProcessing, setSelectedProcessing] = useState<string>('pas');
  const [processingQuantity, setProcessingQuantity] = useState<number>(1);
  const [processingWidth, setProcessingWidth] = useState<number>(20);
  const [processingLength, setProcessingLength] = useState<number>(200);
  const [closureType, setClosureType] = useState<'normal' | 'one-side' | 'two-side'>('normal');
  const [closureLength, setClosureLength] = useState<number>(0);
  const [selectedOrientation, setSelectedOrientation] = useState<'auto' | 'horizontal' | 'vertical'>('auto');
  const [selectedColor, setSelectedColor] = useState<string>('RAL 7016 (Antracyt)');
  const [selectedThickness, setSelectedThickness] = useState<string>('1.0mm');

  const sheet: Sheet = useMemo(() => {
    if (selectedSheet === 'roll') {
      return { width: rollWidth, length: rollLength * 100 };
    }
    return SHEET_TYPES[selectedSheet] as Sheet;
  }, [selectedSheet, rollWidth, rollLength]);

  // Algorytm 2D bin packing dla jednej orientacji
  const calculateLayoutForOrientation = (sheetData: Sheet, partsList: SheetPart[]): LayoutResult => {
    const layout: LayoutResult = {
      parts: [],
      totalWaste: 0,
      wastePercent: 0,
      fitsAll: true,
      usedLength: 0,
      usedWidth: 0,
      wasteWidth: 0,
    };

    let currentX = 0;
    let currentY = 0;
    let maxWidthInColumn = 0;
    let maxLengthUsed = 0;

    partsList.forEach((part) => {
      let actualLength = part.length;
      if (part.closureType === 'one-side') {
        actualLength += part.closureLength || 0;
      } else if (part.closureType === 'two-side') {
        actualLength += (part.closureLength || 0) * 2;
      }

      for (let q = 0; q < part.quantity; q++) {
        let partWidth = part.width;
        let partLength = actualLength;
        let rotated = false;

        // Spróbuj umieścić w bieżącej kolumnie
        if (currentY + partLength > sheetData.length) {
          // Przejdź do nowej kolumny
          currentX += maxWidthInColumn;
          currentY = 0;
          maxWidthInColumn = 0;
        }

        // Jeśli obróbka nie zmieści się nawet w nowej kolumnie, spróbuj obrócić
        if (currentY + partLength > sheetData.length && partWidth < partLength) {
          [partWidth, partLength] = [partLength, partWidth];
          rotated = true;
        }

        // Sprawdź czy zmieści się
        if (currentX + partWidth <= sheetData.width && currentY + partLength <= sheetData.length) {
          layout.parts.push({
            id: `${part.id}-${q}`,
            name: part.name,
            x: currentX,
            y: currentY,
            width: partWidth,
            height: partLength,
            quantity: 1,
            rotated,
          });

          currentY += partLength;
          maxWidthInColumn = Math.max(maxWidthInColumn, partWidth);
          maxLengthUsed = Math.max(maxLengthUsed, currentY);
        } else {
          layout.fitsAll = false;
        }
      }
    });

    // Oblicz maksymalną szerokość użytą
    let maxWidthUsed = 0;
    layout.parts.forEach((part) => {
      maxWidthUsed = Math.max(maxWidthUsed, part.x + part.width);
    });

    layout.usedLength = maxLengthUsed;
    layout.usedWidth = maxWidthUsed;
    layout.wasteWidth = Math.max(0, sheetData.width - maxWidthUsed);
    layout.totalWaste = Math.max(0, sheetData.length - maxLengthUsed);
    layout.wastePercent = (layout.totalWaste / sheetData.length) * 100;

    return layout;
  };

  // Porównaj obie orientacje
  const orientationResult: OrientationResult = useMemo(() => {
    const horizontal = calculateLayoutForOrientation(sheet, parts);
    const vertical = calculateLayoutForOrientation(
      { width: sheet.length, length: sheet.width },
      parts
    );

    const recommended = horizontal.wastePercent <= vertical.wastePercent ? 'horizontal' : 'vertical';

    return { horizontal, vertical, recommended };
  }, [sheet, parts]);

  const currentLayout = useMemo(() => {
    if (selectedOrientation === 'auto') {
      return orientationResult.recommended === 'horizontal'
        ? orientationResult.horizontal
        : orientationResult.vertical;
    }
    return selectedOrientation === 'horizontal'
      ? orientationResult.horizontal
      : orientationResult.vertical;
  }, [selectedOrientation, orientationResult]);

  const displaySheet = useMemo(() => {
    if (selectedOrientation === 'vertical' || (selectedOrientation === 'auto' && orientationResult.recommended === 'vertical')) {
      return { width: sheet.length, length: sheet.width };
    }
    return sheet;
  }, [sheet, selectedOrientation, orientationResult]);

  // Załaduj historię z localStorage przy montażu
  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('kalkulatorHistory') || '[]');
    setHistory(savedHistory);
  }, []);

  // Zapisz do historii po zmianie parts
  useEffect(() => {
    if (parts.length === 0) return;
    
    const historyEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('pl-PL'),
      partsCount: parts.length,
      totalWaste: currentLayout.totalWaste,
      wastePercent: currentLayout.wastePercent,
      sheetsNeeded: sheetsCount,
      parts: parts.map(p => ({ name: p.name, quantity: p.quantity, width: p.width }))
    };
    
    const existingHistory = JSON.parse(localStorage.getItem('kalkulatorHistory') || '[]');
    const updatedHistory = [historyEntry, ...existingHistory].slice(0, 20);
    localStorage.setItem('kalkulatorHistory', JSON.stringify(updatedHistory));
    setHistory(updatedHistory);
  }, [parts, sheetsCount, currentLayout]);

  const handleAddPart = () => {
    const processingType = PROCESSING_TYPES.find((p) => p.id === selectedProcessing);
    if (!processingType) return;

    // Walidacja wymiarów
    if (processingWidth > sheet.width || processingLength > sheet.length) {
      alert(`⚠️ Ostrzeżenie: Obróbka ${processingType.name} (${processingWidth}x${processingLength}cm) jest większa niż arkusz (${sheet.width}x${sheet.length}cm)!\n\nMożliwe jest obrócenie obróbki, ale sprawdź czy to ma sens.`);
    }

    const newPart: SheetPart = {
      id: `${selectedProcessing}-${Date.now()}`,
      name: processingType.name,
      width: processingWidth,
      length: processingLength,
      quantity: processingQuantity,
      closureType: processingType.hasClosureOptions ? closureType : undefined,
      closureLength: processingType.hasClosureOptions ? closureLength : undefined,
    };

    setParts([...parts, newPart]);
    setProcessingQuantity(1);
    setClosureType('normal');
    setClosureLength(0);
  };

  const handleRemovePart = (id: string) => {
    setParts(parts.filter((p) => p.id !== id));
  };

  const handleRemoveFromHistory = (id: string) => {
    const updatedHistory = history.filter((entry) => entry.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('kalkulatorHistory', JSON.stringify(updatedHistory));
  };

  const loadFromHistory = (historyEntry: any) => {
    // Wczytaj obróbki z historii
    const loadedParts = historyEntry.parts.map((p: any, idx: number) => ({
      id: `${p.name}-${idx}`,
      name: p.name,
      width: p.width,
      length: 200,
      quantity: p.quantity,
    }));
    setParts(loadedParts);
  };

  const processingType = PROCESSING_TYPES.find((p) => p.id === selectedProcessing);
  const hasClosureOptions = processingType?.hasClosureOptions || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-2">
            <img 
              src="https://dachekspert.com.pl/wp-content/uploads/2018/09/cropped-logo.png" 
              alt="Logo" 
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-3xl font-bold">Kalkulator Obróbek Blacharskich PRO</h1>
              <p className="text-blue-100 text-sm">Autor: Tomasz Szambara</p>
            </div>
          </div>
          <p className="text-blue-100 text-base">Zaawansowana optymalizacja 2D i konfiguracja materiałów</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lewy panel - Konfiguracja */}
          <div className="lg:col-span-1 space-y-6">
            {/* Arkusz Blachy */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                📋 Arkusz Blachy
              </h2>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {Object.entries(SHEET_TYPES).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedSheet(key as any);
                      if (key === 'roll') {
                        setSelectedOrientation('vertical');
                      }
                    }}
                    className={`p-2 rounded-lg font-semibold text-xs transition-all ${
                      selectedSheet === key
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {value.name}
                  </button>
                ))}
              </div>

              {selectedSheet === 'roll' && (
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Szerokość (cm)</label>
                    <input
                      type="number"
                      value={rollWidth}
                      onChange={(e) => setRollWidth(Math.max(1, parseInt(e.target.value) || 125))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Długość (m)</label>
                    <input
                      type="number"
                      value={rollLength}
                      onChange={(e) => setRollLength(Math.max(1, parseInt(e.target.value) || 10))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                <p className="text-gray-700 text-sm">
                  <span className="font-bold text-blue-600">Wymiary:</span> {sheet.width} cm × {sheet.length} cm
                </p>
              </div>

              {/* Kolory Blachy */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">🎨 Kolor Blachy</label>
                <select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {COLORS.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grubość Blachy */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">📏 Grubość Blachy</label>
                <select
                  value={selectedThickness}
                  onChange={(e) => setSelectedThickness(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {THICKNESSES.map((thickness) => (
                    <option key={thickness} value={thickness}>
                      {thickness}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Orientacja */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                <RotateCw size={20} /> Orientacja Arkusza
              </h2>
              <div className="space-y-2">
                {[
                  { value: 'auto', label: 'Auto (optymalna)' },
                  { value: 'horizontal', label: 'Pozioma' },
                  { value: 'vertical', label: 'Pionowa' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="orientation"
                      value={option.value}
                      checked={selectedOrientation === option.value}
                      onChange={(e) => setSelectedOrientation(e.target.value as any)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-gray-700 font-medium text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
              {selectedSheet !== 'roll' && selectedOrientation === 'auto' && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                  ✓ Rekomendowana: <strong>{orientationResult.recommended === 'horizontal' ? 'Pozioma' : 'Pionowa'}</strong>
                </div>
              )}
              {selectedSheet === 'roll' && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-amber-900">🔒 Blacha z rolki - tylko orientacja <strong>Pionowa</strong></p>
                </div>
              )}
            </div>

            {/* Rodzaj Obróbki */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <h2 className="text-lg font-bold mb-4 text-gray-800">Rodzaj Obróbki</h2>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PROCESSING_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedProcessing(type.id);
                      setProcessingWidth(type.width);
                      setProcessingLength(type.length);
                    }}
                    className={`p-3 rounded-lg text-center transition-all ${
                      selectedProcessing === type.id
                        ? 'bg-blue-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-xl mb-1">{type.icon}</div>
                    <div className="text-xs font-medium">{type.name}</div>
                    <div className="text-xs opacity-70">{type.width}cm</div>
                  </button>
                ))}
              </div>

              {/* Wymiary obróbki */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ilość</label>
                  <input
                    type="number"
                    min="1"
                    value={processingQuantity}
                    onChange={(e) => setProcessingQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1 text-gray-900 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Szer. (cm)</label>
                  <input
                    type="number"
                    min="1"
                    value={processingWidth}
                    onChange={(e) => setProcessingWidth(Math.max(1, parseInt(e.target.value) || 20))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1 text-gray-900 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Dł. (cm)</label>
                  <input
                    type="number"
                    min="1"
                    value={processingLength}
                    onChange={(e) => setProcessingLength(Math.max(1, parseInt(e.target.value) || 200))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1 text-gray-900 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Opcje zamknięcia dla parapetów */}
              {hasClosureOptions && (
                <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Typ zamknięcia</label>
                  <select
                    value={closureType}
                    onChange={(e) => setClosureType(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                  >
                    <option value="normal">Zwykły (bez zmian)</option>
                    <option value="one-side">Zamknięty 1 strona</option>
                    <option value="two-side">Zamknięty 2 strony</option>
                  </select>

                  <div className="mt-3 pt-3 border-t border-amber-200">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {closureType === 'one-side' ? 'Dodaj do długości (1-10cm)' : closureType === 'two-side' ? 'Dodaj do długości (2-20cm)' : 'Dodatkowa długość'}
                    </label>
                    <input
                      type="number"
                      disabled={closureType === 'normal'}
                      min={closureType === 'one-side' ? 1 : 2}
                      max={closureType === 'one-side' ? 10 : 20}
                      value={closureLength}
                      onChange={(e) => setClosureLength(Math.max(0, parseInt(e.target.value) || 0))}
                      className={`w-full border rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        closureType === 'normal'
                          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleAddPart}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md text-sm"
              >
                <Plus size={18} /> Dodaj Obróbkę
              </button>
            </div>

            {/* Tabela obróbek */}
            {parts.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <h3 className="text-lg font-bold mb-3 text-gray-800">Dodane Obróbki ({parts.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {parts.map((part) => (
                    <div
                      key={part.id}
                      className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all"
                    >
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{part.name}</p>
                        <p className="text-xs text-gray-600">
                          {part.width}×{part.length}cm × {part.quantity}szt
                          {part.closureType && part.closureType !== 'normal' && (
                            <span className="ml-2 text-amber-600">
                              ({part.closureType === 'one-side' ? '1 str' : '2 str'} +{part.closureLength}cm)
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemovePart(part.id)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Prawy panel - Wizualizacja i Wyniki */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wizualizacja */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <h2 className="text-lg font-bold mb-4 text-gray-800">Wizualizacja Arkusza</h2>
              <div className="flex justify-center mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <svg
                  viewBox={`0 0 ${displaySheet.width} ${displaySheet.length}`}
                  width="100%"
                  height="400"
                  className="border-2 border-gray-400 bg-white rounded-lg"
                  style={{ maxWidth: '100%', aspectRatio: `${displaySheet.width}/${displaySheet.length}` }}
                >
                  {/* Tło arkusza */}
                  <rect
                    x="0"
                    y="0"
                    width={displaySheet.width}
                    height={displaySheet.length}
                    fill="#ffffff"
                    stroke="#9ca3af"
                    strokeWidth="2"
                  />

                  {/* Obróbki */}
                  {currentLayout.parts.map((part, idx) => (
                    <g key={part.id}>
                      <rect
                        x={part.x}
                        y={part.y}
                        width={part.width}
                        height={part.height}
                        fill="#3b82f6"
                        stroke="#1e40af"
                        strokeWidth="2"
                        opacity="0.9"
                      />
                      <g>
                        <rect
                          x={part.x + part.width / 2 - 20}
                          y={part.y + part.height / 2 - 8}
                          width="40"
                          height="16"
                          fill="#fff"
                          opacity="0.9"
                          rx="2"
                        />
                        {part.height > part.width ? (
                          <text
                            x={part.x + part.width / 2}
                            y={part.y + part.height / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="8"
                            fill="#1e40af"
                            fontWeight="bold"
                            pointerEvents="none"
                            transform={`rotate(90 ${part.x + part.width / 2} ${part.y + part.height / 2})`}
                          >
                            {part.width}×{part.height}
                          </text>
                        ) : (
                          <text
                            x={part.x + part.width / 2}
                            y={part.y + part.height / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="8"
                            fill="#1e40af"
                            fontWeight="bold"
                            pointerEvents="none"
                          >
                            {part.width}×{part.height}
                          </text>
                        )}
                      </g>
                    </g>
                  ))}

                  {/* Odpad */}
                  {currentLayout.totalWaste > 0 && (
                    <g>
                      <rect
                        x="0"
                        y={displaySheet.length - currentLayout.totalWaste}
                        width={displaySheet.width}
                        height={currentLayout.totalWaste}
                        fill="#f97316"
                        opacity="0.6"
                        stroke="#ea580c"
                        strokeWidth="2"
                      />
                      {currentLayout.totalWaste > 15 && (
                        <text
                          x={displaySheet.width / 2}
                          y={displaySheet.length - currentLayout.totalWaste / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="12"
                          fill="#fff"
                          fontWeight="bold"
                        >
                          Odpad: {currentLayout.totalWaste.toFixed(0)}cm
                        </text>
                      )}
                    </g>
                  )}
                </svg>
              </div>

              {/* Wyniki */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-center text-white shadow-md">
                  <p className="text-xs opacity-90">Obróbek zmieści się</p>
                  <p className="text-2xl font-bold">{currentLayout.parts.length}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-3 text-center text-white shadow-md">
                  <p className="text-xs opacity-90">Odpad (cm)</p>
                  <p className="text-2xl font-bold">{currentLayout.totalWaste.toFixed(0)}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-3 text-center text-white shadow-md">
                  <p className="text-xs opacity-90">Procent odpadu</p>
                  <p className="text-2xl font-bold">{currentLayout.wastePercent.toFixed(0)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 text-center text-white shadow-md">
                  <p className="text-xs opacity-90">Arkuszy potrzeba</p>
                  <p className="text-2xl font-bold">{sheetsCount}</p>
                </div>
              </div>

              {/* Analiza opłacalności - Rola vs Arkusze */}
              {parts.length > 0 && selectedSheet !== 'roll' && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 mb-6">
                  <h3 className="text-base font-bold text-green-900 mb-3">💰 Analiza opłacalności</h3>
                  <div className="space-y-2 text-sm">
                    <div className="p-3 bg-white rounded-lg border-l-4 border-blue-500">
                      <p className="font-semibold text-gray-800">📊 Arkusze ({sheet.width}cm x {sheet.length}cm)</p>
                      <p className="text-xs text-gray-600">Potrzeba: {sheetsCount} arkusz(y) | Odpad: {currentLayout.totalWaste.toFixed(0)}cm ({currentLayout.wastePercent.toFixed(1)}%)</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border-l-4 border-orange-500">
                      <p className="font-semibold text-gray-800">📏 Rola ({rollWidth}cm x {rollLength}m)</p>
                      <p className="text-xs text-gray-600">Długość: {(parts.reduce((sum, p) => sum + p.length * p.quantity, 0) / 100).toFixed(2)}m | Odpad: {Math.max(0, rollLength * 100 - parts.reduce((sum, p) => sum + p.length * p.quantity, 0)).toFixed(0)}cm</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Propozycje - Sugestie na Odpad */}
              {currentLayout.totalWaste > 0 && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-2 border-amber-200 mb-6">
                  <h3 className="text-base font-bold text-amber-900 mb-3">💡 Propozycje</h3>
                  <div className="space-y-2">
                    {Math.abs(currentLayout.totalWaste - 10) <= 2 && (
                      <div className="flex items-center gap-2 p-3 bg-white rounded-lg border-l-4 border-blue-500">
                        <span className="text-xl">📐</span>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Listwa Brass (10cm)</p>
                          <p className="text-xs text-gray-600">Idealnie zmieści się w {currentLayout.totalWaste.toFixed(0)}cm odpadu</p>
                        </div>
                      </div>
                    )}
                    {currentLayout.totalWaste >= 17 && currentLayout.totalWaste <= 25 && (
                      <div className="flex items-center gap-2 p-3 bg-white rounded-lg border-l-4 border-green-500">
                        <span className="text-xl">📏</span>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Pas podrynnowy (21cm)</p>
                          <p className="text-xs text-gray-600">Idealnie zmieści się w {currentLayout.totalWaste.toFixed(0)}cm odpadu</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Historia Obliczeń */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-blue-900">📋 Historia Obliczeń ({history.length})</h3>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors"
                  >
                    {showHistory ? 'Ukryj' : 'Pokaż'}
                  </button>
                </div>
                
                {showHistory && history.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {history.map((entry: any) => (
                      <div key={entry.id} className="p-3 bg-white rounded-lg border-l-4 border-blue-500 hover:shadow-md transition-shadow flex justify-between items-start">
                        <div className="flex-1 cursor-pointer" onClick={() => loadFromHistory(entry)}>
                          <p className="font-semibold text-gray-800 text-sm">{entry.timestamp}</p>
                          <p className="text-xs text-gray-600">{entry.partsCount} obróbek • {entry.sheetsNeeded} arkusz(y) • Odpad: {entry.totalWaste.toFixed(0)}cm</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              loadFromHistory(entry);
                            }}
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                          >
                            Wczytaj
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromHistory(entry.id);
                            }}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors flex items-center gap-1"
                          >
                            <X size={12} /> Usuń
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {showHistory && history.length === 0 && (
                  <p className="text-gray-600 text-xs">Brak historii obliczeń</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sekcja kategorii - na dole */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: '🏠 Dachówki', description: 'Elementy do pokrycia dachów' },
            { title: '🛡️ Membrany', description: 'Membrany i uszczelnienia' },
            { title: '💧 Gąsiory', description: 'Gąsiory i obróbki specjalne' },
          ].map((cat, idx) => (
            <div key={idx} className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-3">{cat.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{cat.description}</p>
              <div className="bg-gray-100 rounded-lg p-8 mb-4 text-gray-400 text-sm">
                [Miejsce na rysunek]
              </div>
              <p className="text-xs text-gray-500">Szczegóły i informacje wkrótce</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
