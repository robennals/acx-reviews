---
title: Beating Balatro. Learning mathematics through infinite games.
author: Unknown
reviewAuthor: Anonymous
contestId: 2025-non-book-reviews
contestName: 2025 Non Book Reviews
year: 2025
publishedDate: '2026-02-06T16:57:23.281Z'
slug: beating-balatro-learning-mathematics-through-infinite-games
wordCount: 2357
readingTimeMinutes: 11
originalUrl: >-
  https://docs.google.com/document/d/1B3YxYxLVFjKGicaEkqvt353kt0uimn0PSUQv1PyaHuI
source: gdoc
tags:
  - Science
---

## Before Balatro

Many modern video games, known as roguelikes, challenge players with endless, escalating difficulty rather than a definitive endpoint. After “winning,” players face tougher foes until they inevitably fail, only to restart with upgraded abilities. Popularized by Vampire Survivors, this genre captivates with secrets, unlockable content, and hordes of pixel-art enemies. Surprisingly, mastering these games hinges not only on quick reflexes but also on mathematical thinking, particularly exponential growth. This essay explores how roguelikes, especially Balatro, teach players intuitive mathematics and cognitive skills through strategic gameplay.

Perhaps surprisingly, and not so subtly, one of these critical elements to mastering these games is not as much the twitchy finger (although this also matters!), but a basic knowledge of exponents. The key game logic is not simply to accumulate items and weapons, but to accumulate them in such a way that they combine well. This means both a variety of range attacks and the right combination of objects which will evolve into superweapons.

Through gathering gems from fallen enemies you level up and with each level up—and on chest events—you choose what upgrades to get. In the beginning of the game you decide what your core weapons will be, and you get to observe the exact amount of damage dealt by conveniently displayed damage marks.  

How well you (and your teammate, if you are playing in co-op mode) can be seen at the end of the game via a most important statistical summary.

[Via reddit](https://www.reddit.com/r/VampireSurvivors/comments/sa1bpa/the_best_part_about_vandalier_isnt_its_damage_but/)

As can be seen above the damage has scaled from low level thousands of cumulative damage up to the millions including the ever important DPS (damage per second), although the top weapon here (Pentagram) cannot stand on its own and needs to be combined with the correct other weapons for maximum effect.

This review process, which is an essential part of every game, allows you to play in 30 minute increments while constantly evolving your strategy to see which weapons give you the most umph.  While this genre has produced many imitation offspring, arguably only a few have improved on the overall formula.

Brotato, featuring a violent potato on a mission of mayhem, arguably improved the Vampire Survivor model into unique fast paced stages where you use your cash to choose which weapons and upgrades to use, making for an extremely fast paced game with little margin for error and including complicated strategies which are endlessly debated on the [brotato subreddit](https://www.reddit.com/r/brotato/).

[Brotato Subreddit | Why is this game crack](https://www.reddit.com/r/brotato/comments/1kjiahb/why_is_this_game_crack/)

For example, you can go heavy on the engineering attribute and get weapons (e.g. turrets) that benefit that, or do a melee heavy build, or upgrade other attributes such as “luck” and gamble for powerful rare upgrades.  Depending on your level of mayhem you will go for a simple victory at difficulty level 0 or see if you can make it past the ultimate double boss on level 5 – though true aficionados will attempt to beat the game on level 5 with all potato builds (also [requiring sub 300 ms reaction times](https://www.reddit.com/r/brotato/comments/1flsqak/a_rant_about_psychology_and_peoples_ability_to/)).

Arguably the other game most importantly contributing to this genre is Slay the Spire, a deck building game in which you go up against increasingly powerful opponents. A key element here is that you rarely have a chance to heal, so similar to these other games, there is ultimately a time where the enemies overpower you and you must start over. However in this case upon defeating each enemy you get to pick a card that can significantly upgrade your deck, often featuring special effects.

One of the key ways to win is to figure out which effects stack and build combinations powerful enough to take out the later elites. One simple example of stacking is that “strength” affects each attack so if you have a lot of strength you can find clever ways to chain smaller attacks for max damage.  

Slay the Spire also has additional items called “relics” that you can accumulate that have passive effects, such as giving you a damage multiplier every 10th attack or increasing your block on the third turn.

While you can content yourself simply by collecting unlocks and steam achievements, internet forums are full of strategies to get “ever so far” and you can, by extension, tell a gamer’s seriousness by his casual use of the phrase “ascension level” or knowledge of the Slay the Spire mods.

## Enter Balatro

Curiously, in a world of attention maximization and fast twitches, this genre has evolved to be immensely cognitively challenging and intensely mathematical, illustrated by possibly the greatest game to emerge in the last year, Balatro, a breakaway success that sold over a million copies and won game of the year at the Game Developers Choice Awards (GDCA).

Balatro, from first glance, is a simple remake of poker with a certain number of points per hand.  You have a certain number of cards, you complete a hand, you turn it in, you get points. If your points are above the current target, you win and move on to the next level. If not, you can turn in more hands until you get to “0 hands” left, in which case you die.

The basic game format is three such challenges per level, then eight levels called “antes” for a total of 24 rounds. Each time, naturally, the number of points increases and, with each level step up, it increases more.

Probably no game more clearly illustrates the nature of exponential thinking, insofar as the basic scoring of each hand consists of a relatively formula:  chips + hand\_left \* hand\_right. To illustrate this let’s use a pair of twos.

The level one pair formula is 10 x 2.

The number of chips is said to be the number of visible points on the cards, namely two points for two and two card which makes four.  Thus the formula is (2+2)+10 x 2 or 28 points.

If we previously needed 300 points to go to the next level, we would now need 300-28, or 272 points.

As you might be able to intuit, this “simple math” progresses rapidly and progress is also, with ever larger numbers, the ability to rapidly calculate or approximate the result in your head.  

Now of course this game includes many sorts of bonuses, of which the first and most obvious thing to do is to upgrade the hand from a level 1 hand to a level 2 hand using a planet card (noting that you often don’t get the hand you want out of a pack).

The level two pair formula is 25 x 3. So if we add (2+2) + 25 x 3 or 87 points  So we can see an effective increase of more than doubling for the level up.   But this is just the beginning, we are also able to buy new cards, upgrade our existing cards, and have ongoing effects provided by jokers.

The overall formula is enhanced\_chips + hand\_left \* ( ( hand\_right + multi ) \* xMult )

[Detailed breakdown of Balatro scoring](https://www.reddit.com/r/balatro/comments/1blbexa/detailed_break_down_of_balatro_scoring_system_and/) (see also the [comprehensive guide](https://steamcommunity.com/sharedfiles/filedetails/?l=french&id=3169032575))

As might be apparent, while in the beginning of the game you get common and uncommon cards and build your chips and basic multi, the mid to late game involves watching for the rarer cards (almost always jokers) which have a significant xMult component and can further exponentially increase your output.

## Jokers, Multi, and xMult

Jokers behave like relics in Spire:

*   Additive Multi – e.g. Basic [Joker](https://balatrogame.fandom.com/wiki/Joker): “+4 Multi”
*   Multiplicative xMult – e.g. [Triboulet](https://balatrogame.fandom.com/wiki/Triboulet): “×2 Mult for each played King or Queen.”

Because Multi is inside the parentheses that get multiplied by xMult, stacking both yields superlinear growth. One legendary Joker that increased xMult each scoring hand catapults scores from thousands to millions if protected.

Balatro thus embodies exponential thinking more nakedly than any of its peers: every decision is “How can I push my exponent one step higher before the blind?”

A breakout hit invites ‘speed‑math’: players calculate hand odds and diminishing returns in real‑time. Forums overflow with heuristic tables (“Sell a 2‑cost voucher if ROI < 5 hands”). Fan-made tools such as the [Balatro Calculator](https://efhiii.github.io/balatro-calculator/?) and the [Balatrolator](https://balatrolator.com/?state=----1--5-___________-*_*_*_*_*_*_*_*_*_*_*_*--) also show precisely the complexities to the digits in those cases where your intuitive brain calculator has a high enough margin of error where you need to fact check it.  

Near endless memes exist illustrating key concepts in the [Balatro Subreddit](https://www.reddit.com/r/balatro/)

## Advanced Strategy

The game includes a currency system where players win small amounts per hand. Finding jokers that increase income is crucial for acquiring more upgrades. Advanced players focus on stacking the xMult element through all available means, sometimes requiring specific jokers that must be unlocked through repeated play or obtained via rare "spectral" cards. A key element is also to have enough cash on hand to snatch up the most valuable jokers when they are available, such as the spectral soul card.  

While novice players might celebrate reaching million-point hands, experienced players develop strategies reaching billions or more. Online communities have developed comprehensive guides ranking jokers and their associated strategies.

Additionally, the game offers many types of decks, difficulties for each deck called “stakes,” and 20 additional challenge modes to allow the player to play out unusual scenarios and still come out on top.  

[Detailed guide](https://www.reddit.com/r/balatro/comments/1bbh75a/how_to_win_chips_and_influence_mult_a_thorough/) of all the best strategies from a completionist after 119 hours played.

## Why This Matters

Roguelikes do more than entertain; they sneak real mathematical intuition into everyday play. When a Balatro run catapults from 333 to 3.3 million chips in a few antes, the feel of exponential growth embeds itself in the player’s gut—an insight researchers describe as embodied numeracy [1]. That “aha” lands long before most students encounter compound‑interest formulas in class.

These games also sharpen a sense of probability and risk. Debating whether to reroll a $3 Balatro shop, or hold cash for a $10 rare, mimics the cost‑benefit calculus behind investing, insurance, or even picking checkout lines. Long‑term exposure to such micro‑decisions correlates with better statistical estimation skills in adolescents [2].

A third benefit is the cultivation of iterative problem‑solving. Every failed run generates data; players tweak tactics and retry—a loop analogous to the scientific method. Game‑learning scholarship argues that this constant hypothesis‑testing is a key reason good video games double as “learning machines” [3].

Because these lessons emerge organically—no worksheets required—roguelikes provide a low‑friction on‑ramp to analytical thinking. A free Balatro demo plus a spreadsheet is enough for hobbyists to chart score curves and discover the power of doubling on their own. It’s math by osmosis, translated through the universal language of “one more run.”

Implicit in the concept of “run,” and adults are often forced to reckon with this while sitting next to technology-enabled children, is the concept of speed. Consider, for example, the flabbergasted developers along with a [Slay the Spire speedrun](https://www.youtube.com/watch?v=bxxp7dPG01Q&themeRefresh=1), a [Balatro speedrun](https://www.youtube.com/watch?v=ibSifwm3j6M), or other forms of emergent metagames that allow gamers to create their own categories of winning.  

Indeed, in all of these games one key element, intimately realized by every gamer, is an intensely polished aesthetic that gives rise to a unique look and feel that, in a way transcends the grind of the experience by opening up a world of approachable art, in much the same way that people are invested in Legos or Minecraft because of the dynamic accessibility of the artform.

## Conclusion: Gaming and Education

The question of integrating games into educational curricula deserves serious consideration. If the science of human attention and engagement could be applied to educational game design with the same sophistication as commercial gaming, we might see accelerated learning and deeper understanding of complex concepts.

Despite their competitive elements, these games also foster community. Players share strategies, discoveries, and achievements, creating collaborative learning environments around seemingly solitary experiences.

What makes these games particularly special is their origin. Many breakout titles in this genre come from independent developers working outside mainstream gaming industry channels who prefer to stay solo in order not to  “[lose the love](https://www.reddit.com/r/Games/comments/1bdtmlg/comment/kupyhrr/?context=3).” The attention to detail and [passion evident](https://www.reddit.com/r/Games/comments/1bdtmlg/comment/kupokgw/?context=3) in these games creates a unique experience that keeps players engaged and learning.

Balatro and similar roguelikes demonstrate how sophisticated mathematical thinking can be integrated into entertaining experiences. Through carefully designed progression systems and scoring mechanics, these games teach exponential growth, probability assessment, and strategic planning—all while players focus on having fun rather than "learning math." As gaming continues to evolve, its potential as an educational medium deserves greater recognition and exploration.  

[The golden joker, possibly the baseline of all new economic design models](https://balatrogame.fandom.com/wiki/Golden_Joker)

One key takeaway to keep in mind extends whether or not you are a parent, an educator, or game enthusiast, namely that play spaces, ala Huizinga, Piaget, Sutton Smith and other fathers of ludology, are such because they are purely voluntaristic. In this sense, one the lack of successes of traditional education vis-a-vis new emergent forms is that the new forms have a dynamic element with self-chosen pathways and feel less like a priest’s instructions and more like a 21th century Goldmund (e.g. golden joker) in magical and aesthetically inspired journeys.  

So watch out! Parents, teachers, and children may all have fun together. Hence a final recommendation, go [buy the game](https://store.steampowered.com/app/2379780/Balatro/), and make time to enjoy it.

## Ad summum sine fine

For people inclined to end the endless and find a finite finale, you may have to go deeper into the source code of Balatro. Through digging into the lesser known Löve framework, and the appropriate manipulation of near infinities, floating point numbers and a particular standard known as IEEE754 there is a possible forced finality in this game. See [this Youtuber](https://www.youtube.com/watch?v=XKQ-t9-4-30) for full instructions.

1.  Ke, F. (2008). A Case Study of Computer Game Design on Fifth Graders’ Mathematics Learning and Motivation. Computers & Education, 52(4), 913‑925.
2.  Adachi, P. J. C., & Willoughby, T. (2013). More Than Just Fun: The Role of Strategic Video Games in Improving Adolescents’ Problem‑Solving Skills. Journal of Youth and Adolescence, 42(7), 1041‑1052.
3.  Gee, J. P. (2005). Learning by Design: Good Video Games as Learning Machines. E‑Learning and Digital Media, 2(1), 5‑16.
