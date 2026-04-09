/**
 * Zaawansowana logika optymalizacji 2D z inteligentnymi algorytmami analizy cięcia
 * Automatycznie wybiera najlepszy sposób cięcia (po długości vs. po szerokości)
 */

export interface Part {
  id: string;
  name: string;
  length: number; // cm
  width: number; // cm
  quantity: number;
}

export interface SheetConfig {
  length: number; // cm (X)
  width: number; // cm (Y)
  type: 'standard' | 'narrow' | 'large' | 'roll';
}

export interface CuttingPattern {
  orientation: 'horizontal' | 'vertical'; // horizontal = cięcie po długości, vertical = cięcie po szerokości
  itemsPerSheet: number;
  wastePercent: number;
  sheetsNeeded: number;
  layout: LayoutItem[];
  efficiency: number; // 0-100%
}

export interface LayoutItem {
  x: number;
  y: number;
  length: number;
  width: number;
  partId: string;
  partName: string;
  quantity: number;
}

export interface OptimalCombination {
  bestPattern: CuttingPattern;
  alternativePatterns: CuttingPattern[];
  recommendation: string;
  savings: {
    sheetsPercentSaved: number;
    wasteReduction: number;
  };
}

/**
 * Analizuje wszystkie możliwe orientacje i zwraca optymalny wzór cięcia
 */
export function analyzeOptimalCombination(
  parts: Part[],
  sheet: SheetConfig
): OptimalCombination {
  if (parts.length === 0) {
    return {
      bestPattern: {
        orientation: 'horizontal',
        itemsPerSheet: 0,
        wastePercent: 100,
        sheetsNeeded: 0,
        layout: [],
        efficiency: 0,
      },
      alternativePatterns: [],
      recommendation: 'Dodaj obróbki, aby zobaczyć analizę',
      savings: { sheetsPercentSaved: 0, wasteReduction: 0 },
    };
  }

  // Testuj obie orientacje
  const horizontalPattern = calculateCuttingPattern(parts, sheet, 'horizontal');
  const verticalPattern = calculateCuttingPattern(parts, sheet, 'vertical');

  // Wybierz najlepszy wzór
  const patterns = [horizontalPattern, verticalPattern].sort(
    (a, b) => a.wastePercent - b.wastePercent
  );

  const bestPattern = patterns[0];
  const alternativePatterns = patterns.slice(1);

  // Oblicz oszczędności
  const baselineSheets = calculateBaselineSheets(parts, sheet);
  const sheetsPercentSaved =
    baselineSheets > 0
      ? ((baselineSheets - bestPattern.sheetsNeeded) / baselineSheets) * 100
      : 0;
  const wasteReduction = 100 - bestPattern.wastePercent;

  // Wygeneruj rekomendację
  const recommendation = generateRecommendation(bestPattern, sheetsPercentSaved);

  return {
    bestPattern,
    alternativePatterns,
    recommendation,
    savings: {
      sheetsPercentSaved: Math.max(0, sheetsPercentSaved),
      wasteReduction,
    },
  };
}

/**
 * Oblicza wzór cięcia dla określonej orientacji
 */
function calculateCuttingPattern(
  parts: Part[],
  sheet: SheetConfig,
  orientation: 'horizontal' | 'vertical'
): CuttingPattern {
  if (parts.length === 0) {
    return {
      orientation,
      itemsPerSheet: 0,
      wastePercent: 100,
      sheetsNeeded: 0,
      layout: [],
      efficiency: 0,
    };
  }

  const sheetLength = orientation === 'horizontal' ? sheet.length : sheet.width;
  const sheetWidth = orientation === 'horizontal' ? sheet.width : sheet.length;

  // Sortuj części malejąco po długości
  const sortedParts = [...parts].sort((a, b) => b.length - a.length);

  const layout: LayoutItem[] = [];
  let currentY = 0;
  let totalArea = 0;
  let sheetsNeeded = 1;
  let itemsPlaced = 0;

  for (const part of sortedParts) {
    const partLength = part.length;
    const partWidth = part.width;

    // Sprawdź, czy część mieści się na arkuszu
    if (partLength > sheetLength || partWidth > sheetWidth) {
      continue; // Pomiń części, które się nie mieszczą
    }

    let remainingQuantity = part.quantity;

    while (remainingQuantity > 0) {
      // Sprawdź, czy mamy miejsce w bieżącym rzędzie
      if (currentY + partWidth > sheetWidth) {
        // Przejdź na nowy arkusz
        sheetsNeeded++;
        currentY = 0;
      }

      // Oblicz, ile części mieści się w jednym rzędzie
      const itemsInRow = Math.floor(sheetLength / partLength);

      if (itemsInRow > 0) {
        const itemsToPlace = Math.min(itemsInRow, remainingQuantity);

        for (let i = 0; i < itemsToPlace; i++) {
          layout.push({
            x: i * partLength,
            y: currentY,
            length: partLength,
            width: partWidth,
            partId: part.id,
            partName: part.name,
            quantity: part.quantity,
          });
          itemsPlaced++;
        }

        currentY += partWidth;
        totalArea += partLength * partWidth * itemsToPlace;
        remainingQuantity -= itemsToPlace;
      } else {
        break; // Część się nie mieści
      }
    }
  }

  const sheetArea = sheetLength * sheetWidth;
  const totalSheetArea = sheetArea * sheetsNeeded;
  const wasteArea = totalSheetArea - totalArea;
  const wastePercent =
    totalSheetArea > 0 ? (wasteArea / totalSheetArea) * 100 : 100;
  const efficiency = 100 - wastePercent;

  return {
    orientation,
    itemsPerSheet: itemsPlaced > 0 ? Math.floor(itemsPlaced / sheetsNeeded) : 0,
    wastePercent: Math.max(0, wastePercent),
    sheetsNeeded,
    layout,
    efficiency: Math.max(0, efficiency),
  };
}

/**
 * Oblicza bazową liczbę arkuszy (bez optymalizacji)
 */
function calculateBaselineSheets(parts: Part[], sheet: SheetConfig): number {
  const totalArea = parts.reduce(
    (sum, part) => sum + part.length * part.width * part.quantity,
    0
  );
  const sheetArea = sheet.length * sheet.width;
  return sheetArea > 0 ? Math.ceil(totalArea / sheetArea) : 0;
}

/**
 * Generuje rekomendację tekstową
 */
function generateRecommendation(
  pattern: CuttingPattern,
  sheetsPercentSaved: number
): string {
  const orientationText =
    pattern.orientation === 'horizontal'
      ? 'cięcie po długości arkusza'
      : 'cięcie po szerokości arkusza';

  if (sheetsPercentSaved > 20) {
    return `Cięcie ${orientationText} zaoszczędzi ${sheetsPercentSaved.toFixed(0)}% arkuszy! 🎯`;
  } else if (sheetsPercentSaved > 10) {
    return `Rekomendacja: ${orientationText} - oszczędność ${sheetsPercentSaved.toFixed(0)}% arkuszy`;
  } else if (sheetsPercentSaved > 0) {
    return `Lekka oszczędność (${sheetsPercentSaved.toFixed(0)}%) przy cięciu ${orientationText}`;
  } else {
    return `Oba sposoby cięcia dają podobne wyniki. Wybierz ${orientationText}`;
  }
}

/**
 * Oblicza szczegółowe statystyki dla wzoru cięcia
 */
export function getPatternStats(pattern: CuttingPattern, sheet: SheetConfig) {
  const sheetArea =
    pattern.orientation === 'horizontal'
      ? sheet.length * sheet.width
      : sheet.width * sheet.length;

  const totalSheetArea = sheetArea * pattern.sheetsNeeded;
  const usedArea = totalSheetArea - (pattern.wastePercent / 100) * totalSheetArea;
  const wasteArea = (pattern.wastePercent / 100) * totalSheetArea;

  return {
    sheetsNeeded: pattern.sheetsNeeded,
    wastePercent: pattern.wastePercent.toFixed(1),
    efficiency: pattern.efficiency.toFixed(1),
    usedArea: usedArea.toFixed(0),
    wasteArea: wasteArea.toFixed(0),
    totalArea: totalSheetArea.toFixed(0),
  };
}

/**
 * Generuje wizualizację SVG dla wzoru cięcia
 */
export function generatePatternVisualization(
  pattern: CuttingPattern,
  sheet: SheetConfig,
  scale: number = 1
): string {
  const sheetLength =
    pattern.orientation === 'horizontal' ? sheet.length : sheet.width;
  const sheetWidth =
    pattern.orientation === 'horizontal' ? sheet.width : sheet.length;

  const colors = [
    '#fca5a5',
    '#fb923c',
    '#f97316',
    '#ea580c',
    '#c85a2b',
    '#10b981',
    '#06b6d4',
    '#3b82f6',
  ];

  let svg = `<svg width="${sheetLength * scale}" height="${sheetWidth * scale}" viewBox="0 0 ${sheetLength} ${sheetWidth}" xmlns="http://www.w3.org/2000/svg">`;

  // Tło arkusza
  svg += `<rect x="0" y="0" width="${sheetLength}" height="${sheetWidth}" fill="white" stroke="#1f2937" stroke-width="1"/>`;

  // Rysuj części
  pattern.layout.forEach((item, idx) => {
    const color = colors[idx % colors.length];
    svg += `<rect x="${item.x}" y="${item.y}" width="${item.length}" height="${item.width}" fill="${color}" stroke="#1f2937" stroke-width="0.5" opacity="0.7"/>`;
    svg += `<text x="${item.x + item.length / 2}" y="${item.y + item.width / 2}" text-anchor="middle" dominant-baseline="middle" font-size="8" fill="#1f2937" font-weight="bold">${item.length}x${item.width}</text>`;
  });

  svg += '</svg>';
  return svg;
}

/**
 * Porównuje dwa wzory cięcia
 */
export function comparePatterns(
  pattern1: CuttingPattern,
  pattern2: CuttingPattern
): {
  sheetsSaved: number;
  wasteDifference: number;
  efficiencyGain: number;
} {
  return {
    sheetsSaved: pattern2.sheetsNeeded - pattern1.sheetsNeeded,
    wasteDifference: pattern2.wastePercent - pattern1.wastePercent,
    efficiencyGain: pattern1.efficiency - pattern2.efficiency,
  };
}
