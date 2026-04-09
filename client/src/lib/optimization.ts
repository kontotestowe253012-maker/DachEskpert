/**
 * Logika optymalizacji 2D dla kalkulatora obróbek blacharskich
 * Obsługuje obrót elementów, minimalizację odpadu i wizualizację
 */

export interface Part {
  id: string;
  name: string;
  length: number; // cm
  width: number; // cm
  quantity: number;
}

export interface ParapetConfig {
  type: 'open' | 'closed'; // otwarty lub zamknięty
  sides?: 'single' | 'double'; // jednostronny lub dwustronny (tylko dla zamkniętego)
  fold?: number; // podgięcie 1-10 cm (jednostronny) lub 2-20 cm (dwustronny)
}

export interface SheetConfig {
  length: number; // cm
  width: number; // cm
  type: 'standard' | 'narrow' | 'large' | 'roll';
}

export interface PlacedPart extends Part {
  x: number;
  y: number;
  rotation: boolean; // true = obrócony (90 stopni)
}

export interface OptimizationResult {
  parts: PlacedPart[];
  sheetsNeeded: number;
  wastePercent: number;
  wasteArea: number;
  usedArea: number;
  totalArea: number;
  orientation: 'horizontal' | 'vertical';
}

/**
 * Oblicza wymiary obróbki parapetu na podstawie konfiguracji
 */
export function calculateParapetDimensions(
  baseLength: number,
  config: ParapetConfig
): { length: number; width: number } {
  if (config.type === 'open') {
    return { length: baseLength, width: 20 };
  }

  if (config.type === 'closed') {
    const fold = config.fold || 5;
    const addedLength = config.sides === 'double' ? fold * 2 : fold;
    return {
      length: baseLength + addedLength,
      width: 20,
    };
  }

  return { length: baseLength, width: 20 };
}

/**
 * Algorytm optymalizacji 2D (First Fit Decreasing)
 * Próbuje umieścić elementy na arkuszu, minimalizując odpad
 */
export function optimizeSheet(
  parts: Part[],
  sheet: SheetConfig
): OptimizationResult {
  const sheetArea = sheet.length * sheet.width;
  const allParts: PlacedPart[] = [];
  let totalUsedArea = 0;
  let sheetsNeeded = 1;

  // Sortuj części malejąco po powierzchni
  const sortedParts = [...parts].sort(
    (a, b) => b.length * b.width - a.length * a.width
  );

  // Próbuj umieścić każdą część
  for (const part of sortedParts) {
    for (let q = 0; q < part.quantity; q++) {
      const placed = tryPlacePart(
        part,
        allParts,
        sheet,
        sheetsNeeded
      );

      if (placed) {
        allParts.push(placed);
        totalUsedArea += placed.length * placed.width;
      } else {
        // Jeśli nie można umieścić, przejdź na nowy arkusz
        sheetsNeeded++;
        const newPlaced = tryPlacePart(
          part,
          allParts.filter((p) => p.id.includes(`sheet-${sheetsNeeded - 1}`)),
          sheet,
          sheetsNeeded
        );
        if (newPlaced) {
          allParts.push(newPlaced);
          totalUsedArea += newPlaced.length * newPlaced.width;
        }
      }
    }
  }

  const totalArea = sheetArea * sheetsNeeded;
  const wasteArea = totalArea - totalUsedArea;
  const wastePercent = (wasteArea / totalArea) * 100;

  return {
    parts: allParts,
    sheetsNeeded,
    wastePercent,
    wasteArea,
    usedArea: totalUsedArea,
    totalArea,
    orientation: 'horizontal',
  };
}

/**
 * Próbuje umieścić część na arkuszu, testując obie orientacje
 */
function tryPlacePart(
  part: Part,
  placedParts: PlacedPart[],
  sheet: SheetConfig,
  sheetNumber: number
): PlacedPart | null {
  // Testuj orientację poziomą
  const horizontal = tryPlaceWithOrientation(
    part,
    placedParts,
    sheet,
    false,
    sheetNumber
  );
  if (horizontal) return horizontal;

  // Testuj orientację pionową (obrót)
  const vertical = tryPlaceWithOrientation(
    part,
    placedParts,
    sheet,
    true,
    sheetNumber
  );
  if (vertical) return vertical;

  return null;
}

/**
 * Próbuje umieścić część z określoną orientacją
 */
function tryPlaceWithOrientation(
  part: Part,
  placedParts: PlacedPart[],
  sheet: SheetConfig,
  rotated: boolean,
  sheetNumber: number
): PlacedPart | null {
  const partLength = rotated ? part.width : part.length;
  const partWidth = rotated ? part.length : part.width;

  // Sprawdź, czy część mieści się na arkuszu
  if (partLength > sheet.length || partWidth > sheet.width) {
    return null;
  }

  // Spróbuj umieścić w lewym górnym rogu
  for (let x = 0; x <= sheet.length - partLength; x += 1) {
    for (let y = 0; y <= sheet.width - partWidth; y += 1) {
      // Sprawdź, czy nie koliduje z innymi częściami
      const canPlace = !placedParts.some((placed) => {
        return (
          x < placed.x + (rotated ? placed.width : placed.length) &&
          x + partLength > placed.x &&
          y < placed.y + (rotated ? placed.length : placed.width) &&
          y + partWidth > placed.y
        );
      });

      if (canPlace) {
        return {
          ...part,
          x,
          y,
          rotation: rotated,
          id: `${part.id}-sheet-${sheetNumber}`,
        };
      }
    }
  }

  return null;
}

/**
 * Oblicza wymaganą liczbę arkuszy dla wszystkich części
 */
export function calculateSheetsNeeded(
  parts: Part[],
  sheet: SheetConfig
): number {
  if (parts.length === 0) return 0;

  const totalArea = parts.reduce((sum, part) => {
    return sum + part.length * part.width * part.quantity;
  }, 0);

  if (totalArea === 0) return 0;

  const sheetArea = sheet.length * sheet.width;
  return Math.ceil(totalArea / sheetArea);
}

/**
 * Oblicza procent odpadu
 */
export function calculateWastePercent(
  parts: Part[],
  sheet: SheetConfig,
  sheetsNeeded: number
): number {
  if (parts.length === 0 || sheetsNeeded === 0) return 0;

  const totalArea = parts.reduce((sum, part) => {
    return sum + part.length * part.width * part.quantity;
  }, 0);

  const totalSheetArea = sheet.length * sheet.width * sheetsNeeded;
  if (totalSheetArea === 0) return 0;

  const waste = totalSheetArea - totalArea;

  return (waste / totalSheetArea) * 100;
}

/**
 * Generuje sugestie optymalnych szerokości dla parapetów
 */
export function suggestOptimalWidths(
  sheetLength: number,
  baseWidth: number = 20
): number[] {
  const suggestions: number[] = [];

  // Sugeruj szerokości, które dzielą się równomiernie na długość arkusza
  for (let width = baseWidth; width <= baseWidth + 30; width++) {
    const fits = Math.floor(sheetLength / width);
    if (fits >= 2) {
      suggestions.push(width);
    }
  }

  return Array.from(new Set(suggestions)).slice(0, 5);
}
