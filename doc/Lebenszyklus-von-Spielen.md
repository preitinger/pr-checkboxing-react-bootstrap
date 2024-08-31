# Lebenszyklus von Spielen

## Entstehung

Ein Spiel entsteht, wenn in der Navigationsleiste auf Play geklickt wird und anschließend die Anzahl der Zeilen bestimmt wurde sowie, wer den ersten Zug macht (Mensch oder Computer). Dann wird auf dem Server ein neuer DB-Eintrag mit einem neuen Spiel erzeugt.
Bei Beginn des Spiels wird ein Timestamp abgespeichert, der für einen evtl. Eintrag im Highscore nach einem Sieg des menschlichen Spielers benötigt wird.

## Verwendung

Solange der Benutzer spielt, wird nach jedem menschlichen Zug auf dem Server evtl. ein Computerzug erzeugt und beide (außer bei Spielende) in den Datenbankeintrag eingetragen.

## Löschung

Der Datenbankeintrag zu einem Spiel wird gelöscht, wenn ...
- der Computer gewonnen hat.
- ein Highscore-Eintrag hinzugefügt wurde.
- ein Highscore-Eintrag abgelehnt wurde.
- periodisch, wenn drei Tage kein Zug mehr gemacht wurde.