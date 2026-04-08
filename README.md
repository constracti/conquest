# conquest

TODO game description and documentation

## custom CSS

```css
@font-face {
	font-family: PFSynchPro;
	src: url(https://static.wfonts.com/data/2016/05/05/pf-synch-pro/PFSynchPro-Regular.ttf);
	font-weight: normal;
}

@font-face {
	font-family: PFSynchPro;
	src: url(https://static.wfonts.com/data/2016/05/05/pf-synch-pro/PFSynchPro-Bold.ttf);
	font-weight: bold;
}

:root {
	--bs-body-font-family: PFSynchPro;
}

#canvas {
	--canvas-top: 10%;
	--canvas-left: 0%;
	--canvas-right: 0%;
	--canvas-width: 20%;
}

@media (min-width: 768px) {
	body.timelapse #canvas #status-section {
		width: 70%;
	}
}
```

## translation

- `Count` how many candidates are left in the draw process
- `Draw` draw action
- `from` a player belongs to a team
- `Game over!` game state
- `Game start` game state
- `Game stop` game state
- `Hide` visibility toggle action
- `Minimum successes` threshold of draw process
- `Next` draw action
- `Position` draw position
- `Score` team ranking
- `Show` visibility toggle action
- `Speed` timelapse frames per second
- `Submit` draw action
- `Success` attempt type
- `Success and Conquest` attempt type
- `Success and Neutralization` attempt type
- `Successes` list of attempts
- `Time` timelapse progress

```
Count
Υποψήφιοι

Draw
Κλήρωση

from
από

Game over!
Το παιχνίδι έχει λήξει!

Game start
Έναρξη παιχνιδιού

Game stop
Λήξη παιχνιδιού

Hide
Απόκρυψη

Minimum successes
Ελάχιστες επιτυχίες

Next
Συνέχεια

Position
Θέση

Score
Βαθμολογία

Show
Εμφάνιση

Speed
Ταχύτητα

Submit
Υποβολή

Success
Επιτυχία

Success and Conquest
Επιτυχία και Κατάκτηση

Success and Neutralization
Επιτυχία και Εξουδετέρωση

Successes
Επιτυχίες

Time
Χρόνος
```
