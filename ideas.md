# Kalkulator Obróbek Blacharskich PRO - Design Ideas

## Wybrany Design: **Profesjonalny Minimalizm z Akcentami Technicznych**

### Design Movement
**Bauhaus-inspired Industrial Minimalism** – połączenie czystych linii, funkcjonalności i technicznych akcentów, nawiązujące do profesjonalnych narzędzi inżynierskich.

### Core Principles
1. **Funkcjonalność na pierwszym planie** – każdy element ma jasny cel, nic nie jest dekoracyjne
2. **Hierarchia poprzez kontrast** – mocne kolory dla ważnych akcji, neutralne tła dla skupienia uwagi
3. **Precyzja i dokładność** – interfejs odzwierciedla profesjonalizm branży blacharskiej
4. **Responsywność i przejrzystość** – użytkownik zawsze wie, co się dzieje w kalkulatorze

### Color Philosophy
- **Główny kolor:** Ciepły pomarańczowy (#c85a2b) – reprezentuje energię, profesjonalizm i branżę budowlaną
- **Neutralne tła:** Jasny szary (#f8f9fa) dla głównych sekcji, biały dla kart
- **Akcenty:** Ciemny szary (#1f2937) dla tekstu, zielony (#10b981) dla sukcesu/optymalizacji
- **Ostrzeżenia:** Czerwony (#ef4444) dla błędów i wysokiego odpadu
- **Intencja emocjonalna:** Zaufanie, profesjonalizm, kontrola

### Layout Paradigm
- **Asymetryczne siatki:** Lewa kolumna dla wejść (konfiguracja), prawa dla wyników (wizualizacja)
- **Karty z wyraźnym separowaniem:** Każda sekcja (arkusz, obróbki, parapety) w osobnej karcie
- **Sticky header:** Szybki dostęp do głównych akcji (oblicz, eksportuj, zapisz)
- **Responsywny grid:** Na mobile'u karty układają się w kolumnie

### Signature Elements
1. **Ikony techniczne** – proste, geometryczne ikony z biblioteki lucide-react
2. **Wizualizacja 2D arkusza** – SVG z kolorowym rozmieszczeniem obróbek
3. **Suwaki z wartościami** – interaktywne suwaki dla podgięć i wymiarów
4. **Karty wyników** – duże liczby z etykietami (liczba arkuszy, odpad %)

### Interaction Philosophy
- **Natychmiastowa informacja zwrotna** – toast notifications dla każdej akcji
- **Progresywne ujawnianie** – zaawansowane opcje (parapety, obrót) ukryte w sekcjach
- **Drag-and-drop (opcjonalnie)** – przesuwanie obróbek na wizualizacji
- **Smooth transitions** – płynne zmiany przy przełączaniu opcji

### Animation
- **Entrance:** Fade-in dla kart przy załadowaniu (0.3s)
- **Hover:** Lekki lift na kartach (transform: translateY(-2px))
- **Loading:** Spinner na przyciskach podczas obliczeń
- **Transitions:** Smooth zmiany wartości na suwakach (0.2s)

### Typography System
- **Display:** Sora Bold 700 (32px) – nagłówki stron
- **Heading:** Sora SemiBold 600 (20px) – nagłówki sekcji
- **Body:** Sora Regular 400 (14px) – tekst główny
- **Small:** Sora Regular 400 (12px) – etykiety i podpisy
- **Mono:** System monospace (12px) – wartości techniczne (wymiary, liczby)

---

## Implementacja
- Pomarańczowy (#c85a2b) jako primary color w Tailwind
- Sora font z Google Fonts
- Ciemny szary (#1f2937) jako foreground
- Jasny szary (#f8f9fa) jako background
- Zielony (#10b981) dla akcji optymalizacji
