/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hymn } from '../types';

export const hymnBooks = [
  {
    id: 'english',
    name: 'English Hymnal',
    nativeName: 'Hymn Book',
    description: 'The standard English hymn book as used in sanctuary worship services.',
    colorClass: 'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-600'
  },
  {
    id: 'xhosa',
    name: 'Xhosa Hymnal',
    nativeName: 'Amaculo',
    description: 'Amaculo asetyenziswa kwiinkonzo zesiXhosa zolunqulo.',
    colorClass: 'border-yellow-600 bg-yellow-50/50 dark:bg-yellow-950/20 text-yellow-700'
  },
  {
    id: 'setswana',
    name: 'Setswana Hymnal',
    nativeName: 'Sefela',
    description: 'Difela le diko tsa thuto mo baporofetinye botlhe.',
    colorClass: 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600'
  },
  {
    id: 'sesotho',
    name: 'Sesotho Hymnal',
    nativeName: 'Difela',
    description: 'Buka ea rona ea difela tsa Kereke Lesotho le Afrika Borwa.',
    colorClass: 'border-green-600 bg-green-50/50 dark:bg-green-950/20 text-green-700'
  }
] as const;

export const hymnsDatabase: Hymn[] = [
  {
    bookId: 'english',
    hymnNumber: 1,
    hymnCode: 'E1',
    title: 'O for a thousand tongues to sing',
    author: 'C. Wesley (1707-1788)',
    category: 'Praise and Adoration',
    lyrics: `VERSE 1
O for a thousand tongues to sing
My great Redeemer’s praise,
The glories of my God and King,
The triumphs of His grace!

VERSE 2
My gracious Master and my God,
Assist me to proclaim,
To spread through all the earth abroad
The honors of Thy name.

VERSE 3
Jesus! the name that charms our fears,
That bids our sorrows cease;
’Tis music in the sinner’s ears,
’Tis life, and health, and peace.

VERSE 4
He breaks the power of canceled sin,
He sets the prisoner free;
His blood can make the foulest clean,
His blood availed for me.

VERSE 5
He speaks, and, listening to His voice,
New life the dead receive,
The mournful, broken hearts rejoice,
The humble poor believe.

VERSE 6
Hear Him, ye deaf; His praise, ye dumb,
Your loosened tongues employ;
Ye blind, behold your Savior come,
And leap, ye lame, for joy.`
  },
  {
    bookId: 'english',
    hymnNumber: 2,
    hymnCode: 'E2',
    title: 'Come, Holy Ghost, our hearts inspire',
    author: 'C. Wesley (1707-1788)',
    category: 'Holy Spirit',
    lyrics: `VERSE 1
Come, Holy Ghost, our hearts inspire,
Let us Thine influence prove,
Source of the old prophetic fire,
Fountain of life and love.

VERSE 2
Water with heavenly dew Thy Word,
In our hearts let it grow;
And we shall know the living Lord,
And all His virtues show.

VERSE 3
Expand Thy wings, celestial Dove,
Brood o’er our nature’s night;
On our disordered spirits move,
And let there now be light.`
  },
  {
    bookId: 'english',
    hymnNumber: 3,
    hymnCode: 'E3',
    title: 'Jesus, the name high over all',
    author: 'C. Wesley (1707-1788)',
    category: 'Gospel and Mission',
    lyrics: `VERSE 1
Jesus, the name high over all,
In hell, or earth, or sky;
Angels and men before it fall,
And devils fear and fly.

VERSE 2
Jesus, the name to sinners dear,
The name to sinners given;
It scatters all their guilty fear,
It turns their hell to heaven.

VERSE 3
O that the world might taste and see
The riches of His grace!
The arms of love that compass me
Would all mankind embrace.`
  },
  {
    bookId: 'english',
    hymnNumber: 4,
    hymnCode: 'E4',
    title: 'Father of everlasting grace',
    author: 'C. Wesley (1707-1788)',
    category: 'Covenant and Communion',
    lyrics: `VERSE 1
Father of everlasting grace,
Thy goodness we adore;
Show us the brightness of Thy face,
And bless us evermore.

VERSE 2
Thy mercy and Thy grace impart
To everyone who seeks;
And write Thy law upon each heart,
O Lord, Thy spirit speaks.`
  },
  {
    bookId: 'english',
    hymnNumber: 5,
    hymnCode: 'E5',
    title: 'Spirit of faith, come down',
    author: 'C. Wesley (1707-1788)',
    category: 'Holy Spirit',
    lyrics: `VERSE 1
Spirit of faith, come down,
Reveal the things of God;
And make to us the Savior known,
And apply His precious blood.

VERSE 2
No man can truly say
That Jesus is the Lord,
Unless He feels the Holy Ghost,
And knows the living Word.`
  },
  {
    bookId: 'english',
    hymnNumber: 315,
    hymnCode: 'E315',
    title: 'Guide Me O Thou Great Jehovah',
    author: 'William Williams (1717-1791)',
    category: 'Guidance and Pilgrimage',
    lyrics: `VERSE 1
Guide me, O Thou great Jehovah,
Pilgrim through this barren land;
I am weak, but Thou art mighty;
Hold me with Thy powerful hand.
Bread of heaven, Bread of heaven,
Feed me till I want no more;
Feed me till I want no more.

VERSE 2
Open now the crystal fountain,
Whence the healing stream doth flow;
Let the fire and cloudy pillar
Lead me all my journey through.
Strong Deliverer, Strong Deliverer,
Be Thou still my Strength and Shield;
Be Thou still my Strength and Shield.`
  },
  {
    bookId: 'xhosa',
    hymnNumber: 11,
    hymnCode: 'X11',
    title: 'Bulelani kuYehova (Bulelani kuYeho)',
    author: 'Ingoma Yesiko',
    category: 'Umbulelo kunye nendumiso',
    lyrics: `VERSE 1
Bulelani kuYehova,
Ngokuba elungile,
Amanabakhulu akhe,
Nenceba yakhe ihleli.

VERSE 2
Bulelani kuThixo,
Ophakamileyo kubo bonke,
Amanabakhulu akhe,
Nenceba yakhe ihleli.

VERSE 3
Yena yedwa owenza,
Imimangaliso emikhulu,
Kuba inceba yakhe ihleli,
Kude kube ngunaphakade.`
  },
  {
    bookId: 'xhosa',
    hymnNumber: 1,
    hymnCode: 'X1',
    title: 'Vuthelani ixilongo',
    author: 'Ingoma Yesiko',
    category: 'Isimemo senkonzo',
    lyrics: `VERSE 1
Vuthelani ixilongo,
Kulo lonke ilizwe;
Nali ixesha lofefe,
Lifikile kuthi mfondini.

VERSE 2
Bongani igama likaThixo,
Owasithandayo thina;
Wamthumela uNyana wakhe,
Ukuze asindise thina.`
  },
  {
    bookId: 'xhosa',
    hymnNumber: 21,
    hymnCode: 'X21',
    title: 'Nkosi, Ndithembe Wena',
    author: 'Ingoma Yesiko',
    category: 'Uthemba kunye noKhuseleko',
    lyrics: `VERSE 1
Nkosi, ndithembe Wena,
Kulo lonke ukhambo lwam;
Ungandishiyi ndedwa,
Gxotha zonke iinyembezi zam.

VERSE 2
Xa umoya wam utshatshakele,
Luthungile usizi lwam;
Khawundikhumbule, kwaye,
Ukhanyise owam umendo.`
  },
  {
    bookId: 'setswana',
    hymnNumber: 1,
    hymnCode: 'S1',
    title: 'Re thabele Morena',
    author: 'Sefela sa Setso',
    category: 'Tirelo ya maphelo',
    lyrics: `VERSE 1
Re thabele Morena,
Ka dipelo tse tletseng,
O re tlisitse boitshokong,
Mo phuthegong e e rorileng.

VERSE 2
A re mo obameng bohle,
Ka thero ya boammaaruri,
Leina la gagwe le galalelang,
Le tumiswe go ralala lefatshe.`
  },
  {
    bookId: 'setswana',
    hymnNumber: 15,
    hymnCode: 'S15',
    title: 'Modimo re a go boka',
    author: 'Sefela sa Setso',
    category: 'Tumishong le pako',
    lyrics: `VERSE 1
Modimo re a go boka,
O Thata-yotlhe wa rona,
Tshika e e rorileng fela,
E tletse ka dithato tseo.

VERSE 2
O re tshegetse ka bopelotlhomogi,
Ka malatsi le dingwaga;
Re tshelela mo thutong ya gago,
E e sa sweng e a tshela.`
  },
  {
    bookId: 'sesotho',
    hymnNumber: 1,
    hymnCode: 'SO1',
    title: 'Ke busitswe ke Morena',
    author: 'Difela tsa Setso',
    category: 'Tumiso',
    lyrics: `VERSE 1
Ke busitswe ke Morena,
Molopolli oa ka,
O ntheteletse letlotlo,
Ka mali a bohlokoa.

VERSE 2
Ke mo thabele ka masene,
Letsatsing le letle;
Ditsela tsa ka tsa tsamaea,
Tlas’a nji ea hae e molemo.`
  },
  {
    bookId: 'sesotho',
    hymnNumber: 22,
    hymnCode: 'SO22',
    title: 'O, a re roriseng Jehova',
    author: 'Difela tsa Setso',
    category: 'Mahlomola a rona',
    lyrics: `VERSE 1
O, a re roriseng Jehova,
Ka monyaka o bohlokoa;
O re thuse ho lopolla,
Melato eohle ea rona.

VERSE 2
Atamela ho rona, Molopolli,
Tshollela moea oa hao;
O re nehe matla ditseleng,
Tsa lentsoe la rona le halalelang.`
  }
];
