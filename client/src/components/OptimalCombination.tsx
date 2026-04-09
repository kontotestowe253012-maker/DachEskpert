import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, TrendingDown, Lightbulb, BarChart3 } from 'lucide-react';
import {
  analyzeOptimalCombination,
  getPatternStats,
  comparePatterns,
  Part,
  SheetConfig,
} from '@/lib/advanced-optimization';

interface OptimalCombinationProps {
  parts: Part[];
  sheet: SheetConfig;
}

export function OptimalCombination({ parts, sheet }: OptimalCombinationProps) {
  const analysis = useMemo(() => {
    return analyzeOptimalCombination(parts, sheet);
  }, [parts, sheet]);

  const bestStats = useMemo(() => {
    return getPatternStats(analysis.bestPattern, sheet);
  }, [analysis.bestPattern, sheet]);

  const comparison = useMemo(() => {
    if (analysis.alternativePatterns.length === 0) return null;
    return comparePatterns(analysis.bestPattern, analysis.alternativePatterns[0]);
  }, [analysis]);

  if (parts.length === 0) {
    return (
      <Card className="p-8 text-center bg-gradient-to-br from-slate-50 to-slate-100 border-dashed">
        <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
        <p className="text-muted-foreground">Dodaj obróbki, aby zobaczyć analizę optymalnego cięcia</p>
      </Card>
    );
  }

  const orientationLabel =
    analysis.bestPattern.orientation === 'horizontal'
      ? 'Cięcie po długości'
      : 'Cięcie po szerokości';

  const efficiencyColor =
    analysis.bestPattern.efficiency >= 85
      ? 'text-green-600'
      : analysis.bestPattern.efficiency >= 70
        ? 'text-amber-600'
        : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Główna rekomendacja */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Optymalna Kombinacja</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{analysis.recommendation}</p>

            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="bg-primary">
                {orientationLabel}
              </Badge>
              <Badge variant="secondary">
                {bestStats.sheetsNeeded} arkusz{bestStats.sheetsNeeded === 1 ? '' : 'y'}
              </Badge>
              <Badge variant="outline" className={efficiencyColor}>
                {bestStats.efficiency}% efektywności
              </Badge>
            </div>
          </div>

          {analysis.savings.sheetsPercentSaved > 0 && (
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {analysis.savings.sheetsPercentSaved.toFixed(0)}%
              </div>
              <p className="text-xs text-muted-foreground">oszczędności</p>
            </div>
          )}
        </div>
      </Card>

      {/* Szczegółowe statystyki */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Wymagane arkusze</p>
          <p className="text-2xl font-bold text-foreground">{bestStats.sheetsNeeded}</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Odpad</p>
          <p className="text-2xl font-bold text-destructive">{bestStats.wastePercent}%</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Efektywność</p>
          <p className={`text-2xl font-bold ${efficiencyColor}`}>{bestStats.efficiency}%</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Pole użyte</p>
          <p className="text-2xl font-bold text-accent">{bestStats.usedArea} cm²</p>
        </Card>
      </div>

      {/* Porównanie orientacji */}
      {comparison && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-foreground">Porównanie orientacji</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Arkusze zaoszczędzone</p>
              <p className={`text-2xl font-bold ${comparison.sheetsSaved > 0 ? 'text-green-600' : 'text-slate-600'}`}>
                {comparison.sheetsSaved > 0 ? '+' : ''}{comparison.sheetsSaved}
              </p>
            </div>

            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Redukcja odpadu</p>
              <p className={`text-2xl font-bold ${comparison.wasteDifference < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                {comparison.wasteDifference < 0 ? '' : '+'}{comparison.wasteDifference.toFixed(1)}%
              </p>
            </div>

            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Zysk efektywności</p>
              <p className={`text-2xl font-bold ${comparison.efficiencyGain > 0 ? 'text-green-600' : 'text-slate-600'}`}>
                {comparison.efficiencyGain > 0 ? '+' : ''}{comparison.efficiencyGain.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Wizualizacja */}
      <Card className="p-6">
        <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Wizualizacja wzoru cięcia
        </h4>

        <div className="flex justify-center bg-secondary rounded-lg p-6 overflow-x-auto">
          <svg
            width={Math.min(sheet.length * 1.5, 500)}
            height={Math.min(sheet.width * 1.5, 350)}
            viewBox={`0 0 ${analysis.bestPattern.orientation === 'horizontal' ? sheet.length : sheet.width} ${analysis.bestPattern.orientation === 'horizontal' ? sheet.width : sheet.length}`}
            className="border-2 border-primary/30"
          >
            {/* Tło arkusza */}
            <rect
              x="0"
              y="0"
              width={analysis.bestPattern.orientation === 'horizontal' ? sheet.length : sheet.width}
              height={analysis.bestPattern.orientation === 'horizontal' ? sheet.width : sheet.length}
              fill="white"
              stroke="#1f2937"
              strokeWidth="1"
            />

            {/* Rysuj części */}
            {analysis.bestPattern.layout.map((item, idx) => {
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
              const color = colors[idx % colors.length];

              return (
                <g key={`${item.partId}-${idx}`}>
                  <rect
                    x={item.x}
                    y={item.y}
                    width={item.length}
                    height={item.width}
                    fill={color}
                    stroke="#1f2937"
                    strokeWidth="0.5"
                    opacity="0.75"
                  />
                  <text
                    x={item.x + item.length / 2}
                    y={item.y + item.width / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fill="#1f2937"
                    fontWeight="bold"
                  >
                    {item.length}×{item.width}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Wymiary arkusza:{' '}
          {analysis.bestPattern.orientation === 'horizontal'
            ? `${sheet.length} × ${sheet.width}`
            : `${sheet.width} × ${sheet.length}`}{' '}
          cm
        </p>
      </Card>

      {/* Alternatywne orientacje */}
      {analysis.alternativePatterns.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold text-foreground mb-4">Alternatywne orientacje</h4>

          <Tabs defaultValue="alternative-0">
            <TabsList className="grid w-full grid-cols-1">
              {analysis.alternativePatterns.map((pattern, idx) => (
                <TabsTrigger key={idx} value={`alternative-${idx}`}>
                  {pattern.orientation === 'horizontal' ? 'Cięcie po długości' : 'Cięcie po szerokości'} (
                  {pattern.sheetsNeeded} arkuszy)
                </TabsTrigger>
              ))}
            </TabsList>

            {analysis.alternativePatterns.map((pattern, idx) => {
              const stats = getPatternStats(pattern, sheet);
              return (
                <TabsContent key={idx} value={`alternative-${idx}`} className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-secondary rounded">
                      <p className="text-xs text-muted-foreground mb-1">Arkusze</p>
                      <p className="text-xl font-bold">{stats.sheetsNeeded}</p>
                    </div>
                    <div className="p-3 bg-secondary rounded">
                      <p className="text-xs text-muted-foreground mb-1">Odpad</p>
                      <p className="text-xl font-bold text-destructive">{stats.wastePercent}%</p>
                    </div>
                    <div className="p-3 bg-secondary rounded">
                      <p className="text-xs text-muted-foreground mb-1">Efektywność</p>
                      <p className="text-xl font-bold text-accent">{stats.efficiency}%</p>
                    </div>
                    <div className="p-3 bg-secondary rounded">
                      <p className="text-xs text-muted-foreground mb-1">Pole użyte</p>
                      <p className="text-xl font-bold">{stats.usedArea} cm²</p>
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </Card>
      )}
    </div>
  );
}
