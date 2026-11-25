import * as THREE from 'three'

export interface Puzzle {
  /** Gegenstand, der den Schatten wirft */
  answer: string
  decoys: [string, string]
  /** Euler-Winkel (XYZ) des Gegenstands, wenn die Lampe von vorn leuchtet */
  view: [number, number, number]
  /** zusätzliche Drehung um die Lichtachse – macht den Schatten fremd */
  roll: number
  aha: string
}

export const PUZZLES: Puzzle[] = [
  {
    answer: 'donut',
    decoys: ['tasse', 'apfel'],
    view: [Math.PI / 2, 0, 0],
    roll: 0,
    aha: 'Von oben ist ein Donut einfach ein Ring mit Loch.',
  },
  {
    answer: 'bleistift',
    decoys: ['mutter', 'tasse'],
    view: [0, Math.PI / 2, 0],
    roll: 0.35,
    aha: 'Ein Bleistift von hinten: ein Sechseck – ohne Loch in der Mitte.',
  },
  {
    answer: 'tasse',
    decoys: ['eimer', 'weinglas'],
    view: [0, 0, 0],
    roll: Math.PI / 2,
    aha: 'Eine liegende Tasse. Das Loch im Schatten ist der Henkel.',
  },
  {
    answer: 'korken',
    decoys: ['partyhut', 'ei'],
    view: [0, 0, 0],
    roll: Math.PI / 4,
    aha: 'Der Wunderkorken: von vorn ein Quadrat, von der Seite ein Dreieck, von unten ein Kreis.',
  },
  {
    answer: 'stuhl',
    decoys: ['tisch', 'hocker'],
    view: [0, Math.PI / 2, 0],
    roll: Math.PI,
    aha: 'Ein Stuhl von der Seite – kopfüber. Die hohe Lehne macht das „h“.',
  },
  {
    answer: 'schirm',
    decoys: ['pilz', 'lampe'],
    view: [0, 0, 0],
    roll: -0.7,
    aha: 'Ein schief gehaltener Regenschirm. Der Haken unten verrät ihn.',
  },
  {
    answer: 'hantel',
    decoys: ['garnrolle', 'knochen'],
    view: [0, 0, 0],
    roll: 1.15,
    aha: 'Eine Hantel von vorn: dicke Scheiben, dünne Stange, die übersteht.',
  },
  {
    answer: 'birne_lampe',
    decoys: ['birne_obst', 'eis'],
    view: [0, 0, 0],
    roll: 2.75,
    aha: 'Eine Glühbirne kopfüber. Das Gewinde macht die kleinen Zacken.',
  },
]

/** Orientierung, in der der Gegenstand genau diesen Schatten wirft. */
export function shadowQuaternion(p: Puzzle): THREE.Quaternion {
  const qView = new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.view, 'XYZ'))
  const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), p.roll)
  return qRoll.multiply(qView)
}

export function displayQuaternion(display: [number, number, number]): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(...display, 'XYZ'))
}
