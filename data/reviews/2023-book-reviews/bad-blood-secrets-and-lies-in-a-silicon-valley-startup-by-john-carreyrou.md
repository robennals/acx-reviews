---
title: 'Bad Blood: Secrets and Lies in a Silicon Valley Startup by John Carreyrou'
author: Unknown
reviewAuthor: Anonymous
contestId: 2023-book-reviews
contestName: 2023 Book Reviews
year: 2023
publishedDate: '2026-02-06T07:21:10.023Z'
slug: bad-blood-secrets-and-lies-in-a-silicon-valley-startup-by-john-carreyrou
wordCount: 1740
readingTimeMinutes: 8
originalUrl: >-
  https://docs.google.com/document/d/10CiEI7aDL2bMIdx7yayy3vlq0TJ8dO5LGnG7yIDPiw8
source: gdoc
tags:
  - Technology
  - Economics
---

Elizabeth Holmes is a political prisoner.

Now that I’ve gotten your attention with a click-baitey-enough lead, allow me to attempt to qualify my answer in a manner that, I hope, will redound to my sanity in your eyes.

 As an engineer myself, I have enough experience to have absolutely no doubt about the following:

*   That Elizabeth Holmes’s “product” was an absolute pile of garbage, despite her seemingly sincere submissions to the contrary;
*   That this was partially, but not entirely, the result of the fact that the nature of her personality perpetuated and maintained an egregiously toxic work environment wherein, even if there did exist a spark of ingenuity that could, cultivated, have conceivably effected her dream, it would have immediately been snuffed out.

I assume these facts to be true, because I have lived this experience enough times that it is not at all alien to me, such that I cannot in principle say that Elizabeth Holmes deserves to be in prison any more than any other startup founder. In other words, if she needs to go to prison, then the greater part of California, at least, needs to go to prison if our legal system is to maintain any shred of principled decision-making.

## I.

My argument relies heavily on a phenomenon that, though you may understand it on a rational level, you won’t be able to grok it but by analogy and comparison.

The Gell-Mann Amnesia Effect: Even if you are not familiar with it by name, you are familiar with it by experience: You are mindlessly scrolling through a news feed and you see something that is obviously fake news—and you were able to immediately understand it was fake precisely because you happen to be an expert in the niche that story happened to be talking about. Nevertheless, you read on through the news, somehow not realizing that the fact that the news was able to be that obviously wrong on something so obvious means that it has lost all credibility.

Something similar happened to me while reading Bad Blood such that I have no reservations claiming to be an authority on the book insofar as to put my honor on the line in presuming to write a book review thereabout:

The firings caused Justin to further sour on Theranos. The staff turnover was like nothing he’d ever experienced before and he was troubled by what he saw as a culture of dishonesty at the company.

The worst offender was Tim Kemp, the head of the software team. Tim was a yes-man who never leveled with Elizabeth about what was feasible and what wasn’t. For instance, he’d contradicted Justin and assured her they could write the Edison software’s user interface faster in Flash than in JavaScript. The very next morning, Justin had spotted a Learn Flash book on his desk.

After reading this, I was unable to maintain any suspension of disbelief in this journalism. Take a moment and see if you can identify why this is clearly fake news. It may not be obvious—or, if it is, it isn’t obvious to me who am an engineer (in which case there are at least two reasons to know that this is fake).

Now the answer: there are a million reasons why a person who isn’t a “yes-man” would have a “Learn Flash” book on his desk:

Virtually all commercial software development nowadays takes place over IDEs (“Integrated Development Environment”): The whole point of an IDE is to simplify an otherwise onerous process of configuring programming environments (which basically means setting up all the settings and parameters so you can start to lay the code that will effect your vision, and this almost always takes a lot of time). Modern IDEs have many features we take for granted: for example, it has autocompletion—software that will predict, and provide explanatory templates for, the code you plan to write.

Why is autocompletion important? This is why:

std::[string](https://www.google.com/url?q=https://cplusplus.com/reference/string/string/&sa=D&source=editors&ust=1770366049834146&usg=AOvVaw06vy6wfr4TMx2WgmNxzb4z)::string

default (1)

string();

copy (2)

string (const string& str);

substring (3)

string (const string& str, size\_t pos, size\_t len = npos);

from c-string (4)

string (const char\* s);

from sequence (5)

string (const char\* s, size\_t n);

fill (6)

string (size\_t n, char c);

range (7)

template <class InputIterator>  string  (InputIterator first, InputIterator last);

These are seven different ways to construct a “string” which is just an assortment of characters—one of the most basic objects in a programmer’s toolkit. Could you remember what each term means and when to use which?

If you were an engineer you could learn the concept behind each one and then go “oh, that makes sense”—but, unless you’re some savant (and, believe it or not, not all engineers are savants—in fact, most are not), there is no way you could remember the exact order and meaning of all those things separated by commas in the parentheses.

I have chosen to show the syntax for string construction, because strings are one of the most common and simple objects available to a programmer.  How much more abstruse, then, is virtually everything else you might want to do with a programming language?

We take for granted modern “assistive technologies” to help us write code, but that hasn’t always been the case. Remember that Theranos was in the mid-2000s. Could anyone say for sure whether there were any reference texts for Flash there were online? And, if there were, were they hard to navigate? Were there any Flash IDEs that have the same convenience as modern IDEs? Maybe, but I doubt it. For all you know, the “Learn Flash” book could have been the best reference guide that was available at the time.

The point here is not that I’m right. The point here is that there are many reasons for why someone who is competent in Flash would find it necessary to keep a “Learn Flash” book on his desk—many reasons which aren’t due to “a yes-man who never leveled with Elizabeth about what was feasible and what wasn’t.”

## II.

“Engineer” comes from the same etymological root as “ingenuity.” But, as an engineer, I am here to tell you that this is a fraud—and the fact that this fraud has managed to entrench itself in English etymology is a testament to the power of saliency bias.

Saliency bias is our propensity to give more weight to evidence that is visible while giving more weight to evidence that is not visible. An obvious example would be to take the fact that a disproportionate number of violent criminals are black to infer that an individual black is more likely to be a violent criminal; but this ignores the vast majority of blacks who are not violent criminals, and when these law-abiding blacks are properly factored into the analysis, it may very well that the a posteriori probability that an individual is a violent criminal given that he is black may not be significantly more than the a priori probability.

The same is true for engineering. It’s far too easy to look at a skyscraper, or a bridge, or a computer, and think: “Wow, what ingenuity!” But your salience bias blinds you to all the hidden evidence.

The fact that everything around you works is not the result of some sort of innate “ingenuity” that engineers have; rather, it’s the result of massive amounts of trial-and-error, where virtually all trials end in “failure” and all the “successes” we keep and build upon. Human beings did not suddenly build skyscrapers: many, many years ago, we built huts, and over the millennia we attempted to build even bigger huts—but most huts collapse. If you’re dazzled by downtown New York City, that’s only because you’re ignoring the soles of your feet, on which are strewn microscopic flecks of rubble from all the buildings that collapsed long before they reached anywhere near that height.

It is thus not surprising that “accidental discoveries” are common in the world of engineering. Legend has it that the microwave oven was invented during the process of trying to develop some form of radar. And, absent some evidence to the contrary, I do not believe that what drove the development of the transistor was a desire to share endless pornographic material around the world.

Thus the fact that some people by chance just happen to find something that changes the world does not elevate them, in some moral sense, above those that grasp only dust, for the latter furnish necessary trials in our journey across the Law of Large Numbers to technological progression.

## III.

But the route to progress is rocky. There are inevitably bumps along the way. And when there are, because no one knows what she’s doing (and the one who says she does is the biggest liar of them all), all our efforts and energy are devoted to the question of whom to blame.

Many screw-ups are benign and the lack of charity behind the charges is venial (e.g., “You’re the manager of a tech group, yet you have difficulty logging onto Zoom?”). But then, on the other hand, you get Elizabeth Holmes.

I admit that the only reason I’m not immediately going on a “Free Elizabeth” crusade is because I get a lot of Schadenfreude out of her situation, a sort of satisfaction at seeing the principle of “sow the wind, reap the whirlwind” applied in real life. But I also admit that I cannot, in a principled manner, condemn her without condemning every engineering endeavor ever.

They say that the vast majority of startups fail. The only reason, then, that Elizabeth’s case got to the point it did was that she managed to piss off a lot of very influential men—like Henry Kissinger.

And this is, above all, why Elizabeth’s story is not only not alien to me, but also why I have zero sympathy for her: I know for a fact that if I were an old, rich, powerful man and a beautiful(ish) woman promised me the world, only to bamboozle me—you bet I absolutely would use all my resources and power to destroy her life.

Though many patients claimed to be irrevocably hurt by her actions, the jury did not find Elizabeth Holmes guilty of any criminal action toward patients. She was found guilty only of defrauding investors. Don’t look too closely—else you’ll see in this story an indictment of our society larger than that of any individual woman.

* * *
