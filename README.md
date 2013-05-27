Ozmo - HTML/nodejs game
========

Opis projektu
========
Celem projektu jest stworzenie gry online z nielimitowaną - a w zasadzie limi-
towaną jedynie przez możliwości serwera - liczbą graczy.(Czy aby to ma sens? Zbyt duża mapa = zbyt małe prawdopodobieństwo "styknięcia się").
Każdy z graczy wciela się w rolę ”kulki”, za zadanie ma stać się jak największym
w określonym czasie. Przegrywa w momencie gdy zostaje całkowicie ”zjedzony”,
wygrywa zajmując miejsce TOP1 pod kątem wielkości kulki.

Mechanika
========
Postać gracza staje się większa gdy ”zjada” mniejsze kulki - w tym graczy
(przejmując wielkość ich kulek), zaś mniejsza gdy większa kulka/gracz próbuje
zjeść jego. Zjadanie polega na przebywaniu w kontakcie z drugą kulką, przebiega
liniowo z określoną prędkością. Gracz może poruszać kulką tracąc przy tym
swoją wielkość, szybszy ruch = szybsza utrata wielkości.


