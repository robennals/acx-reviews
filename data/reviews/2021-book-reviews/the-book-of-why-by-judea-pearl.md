---
title: The Book Of Why by Judea Pearl
author: Unknown
reviewAuthor: Anonymous
contestId: 2021-book-reviews
contestName: 2021 Book Reviews
year: 2021
publishedDate: '2021-01-01T00:00:00.000Z'
slug: the-book-of-why-by-judea-pearl
wordCount: 2125
readingTimeMinutes: 10
originalUrl: https://docs.google.com/document/d/1M1m8o1HInGYJR3cEMYZ6TQgNmeBOWo98YC6djNnFWf0
source: gdoc
tags:
  - Philosophy
  - Science
---

[Here](https://www.npr.org/2020/04/02/825903331/pakistani-court-overturns-murder-conviction-in-killing-of-journalist-daniel-pear) is a strange coincidental story from a couple of days ago mentioning the author Judea Pearl. Unfortunately he seems most famous for some shitty terrorist act which killed his son. I mention it only to emphasize the important fact that weird coincidences do happen. But let’s quickly set that aside and remind ourselves who the author, Judea Pearl, really is.

[Wikipedia tells me](https://en.wikipedia.org/wiki/Turing_Award) that Pearl won the Turing Award: "For fundamental contributions to artificial intelligence through the development of a calculus for probabilistic and causal reasoning."

"The Book Of Why: The New Science Of Cause And Effect" is Pearl’s best attempt to communicate what that means to people like me. I get the feeling that communicating to regular people is not Pearl’s primary strength (observe there is a co-writer, Dana MacKenzie).

What is the point of the book? What problem does it try to solve? Well, it turns out that it’s quite topical. Take the following example. An excellent author I’ve [previously reviewed](http://xed.ch/b/2017/0514.html), Ed Yong, [writes in the Atlantic](https://www.theatlantic.com/health/archive/2020/04/pandemic-confusing-uncertainty/610819/):

> The French studies that first suggested that [hydroxychloroquine] could treat COVID-19 were severely flawed, abandoning standard elements of solid science like randomly assigning patients to receive treatments or placebos, or including a control group to confirm if the drug offers benefits above normal medical care. The lead scientist behind those studies has railed against the "dictatorship of the methodologists," as if randomization or controls were inconveniences that one should rebel against, rather than the backbone of effective medicine.

For the last century or so, statistics has indeed assumed that if you really want to understand if a drug _causes_ a beneficial effect, you needed to do a [randomized controlled trial](https://en.wikipedia.org/wiki/Randomized_controlled_trial). Statistics textbooks do not admit any other way. But what if there was a way? Judea Pearl thinks that sometimes there is. That’d be pretty important right about now.

The real core of the book is causality. Did the drug _cause_ the recovery? To understand why this is a complicated question, consider this wonderful example of bad causality - a crystal health index. [This article](https://deponysum.com/2019/06/06/economic-freedom-indexes-are-bad-actually/) basically constructs a crystal health index where medical outcomes are tied to things like exercise, diet, and proximity to crystals. Clearly this crystal index will correlate to good health, but is that because crystals cause good health? No, it is a flawed metric by design to illustrate the problems with such things.

Here’s another critique of relying too heavily on randomized controlled trials. [Parachute use to prevent death and major trauma related to gravitational challenge: systematic review of randomised controlled trials](https://www.bmj.com/content/327/7429/1459). Go ahead and read the abstract — it’s pretty funny. But the point is that sometimes the ideas behind RCTs are overkill. Pearl would like us to think of these problems in a different way and has some interesting insight.

Here’s another example I came across. Check out [the interesting history of bone marrow transplants](https://medium.com/@jamesheathers/hurry-dont-rush-e1aee626e733). It describes when this painful procedure was in fashion, even though it is now generally regarded as worse than useless. This quote sums up a conundrum both for treatments that work great and bogus ones.

> So the procedure wasn’t just **untested**, it also **couldn’t be easily tested**, because what patient enrolls in a clinical trial where you get assigned at random to a control group, where you **wouldn’t** get a live-saving procedure? Do you want to be the dead data point which allows someone else to be the live one?

So how did we get here? When guys like Pascal, Cardano, Fermat, Huygens, Halley, deMoivre, Bernoulli, LaPlace, and Gauss worked on probabilistic thinking, they really were just trying to make some sense out of card games for their rich gambling patrons. Their limited success was cool — making sense out of more complicated things seemed promising.

> Ironically, the need for a theory of causation began to surface at the same time that statistics came into being. In fact, modern statistics hatched from the same causal questions that Galton and Pearson asked about heredity and their ingenious attempts to answer them using cross-generational data. Unfortunately, they failed in this endeavor, and rather than pause to ask why, they declared those questions off limits and turned to developing a thriving, causality-free enterprise called statistics.
>
> — p4

Francis Galton (Darwin’s cousin) invented the linear regression. His student Pearson invented the (Pearson) correlation coefficient. Pearl believes these guys set up "scientific" thinking — probably better called "natural philosophy" for this discussion — to only accept randomized controlled trials. Rightly or wrongly, this effectively shut down other possible ways of inferring causality. Pearl believes this was an unfortunate error.

> [Traditional statistics practitioners] believe that the legitimacy of causal inference lies in replicating a randomized experiment as closely as possible, on the assumption that this is the only route to the scientific truth. I believe that there may be other routes, which derive their legitimacy from a combination of data and established (or assumed) scientific knowledge.
>
> — p334

Pearl tries to more accurately identify what the essential magic is with RCT.

> "…the principle objective of an RCT [randomized controlled trial] is to eliminate confounding…"
>
> — p150

Confounding is "…the discrepancy between what we want to assess (the causal effect) and what we actually do assess using statistical methods." Confounding is a discrepancy between these terms.

P(Y|X) != P(Y|do(X))

The first term is the probability of Y given X. E.g. the probability of dying given that a patient was in icy water for 10 minutes. The second term was more problematic to me. It seems to mean: the probability of Y given _action is taken to ensure_ X. So, e.g. the probability of dying given that someone was thrown overboard into icy water for 10 minutes. Subtle difference — at least statistically. Filed under [probabilistic causation](https://en.wikipedia.org/wiki/Probabilistic_causation), Wikipedia says: "**do(X)** stands for an external intervention that compels the truth of X."

Mmmm Hmmm. Okaaay. Is this notion and notation important? Pearl emphatically tells us yes!

> You might say it’s obvious or common sense, but generations of scientists have struggled to articulate that common sense formally, and a robot cannot rely on our common sense when asked to act properly.
>
> — p151

I love his computer science spirit there but unfortunately the book was filled with hand waving "math" and no real code that "a robot could rely on". Sure, I guess the translation is theoretically possible but not by me.

I liked this little plug for his pet do-operator.

> Lacking a [causal] diagram or a do-operator, five generations of statisticians and health scientists had to struggle with surrogates, none of which were satisfactory. Considering that the drugs in your medicine cabinet may have been developed on the basis of a dubious definition of "confounders," you should be somewhat concerned.
>
> — p152

I can tell you [a lot of other reasons](http://xed.ch/b/2013/1203.html) you should be concerned too!

Ok, so there’s this **do** operator which makes the flaky weird world of statistical notation just a little bit flakier and weirder.

To me, what was more immediately comprehensible was how Pearl invited some graph theory into the party. For all my irritation with boffins hiding behind abstruse mathematical glossolalia, graph theory is actually totally wholesome.

Pearl proposes some kind of causal graph is a useful prop. Here’s one that I found (not in the book) which shows a lot of stuff going on.![](https://acximages.ennals.org/images/2021-book-reviews/20722d3cef172802.png)

I believe that the arrowhead points to the thing that the arrow’s tail causes. Pearl believes there are some fundamental arrangements of causal graphs and that many logical errors can be rooted out by thinking in this way.

Here is how the graphs relate to the **do** operator, and how all that relates to something like randomized controlled trials.

> The do-operator erases all the arrows that come into X, and in this way it prevents any information about X from flowing in the noncausual direction. Randomization has the same effect.
>
> — p157

Here is one example of a motif he highlights (on p161). It is an M-bias arrangement.

![](https://acximages.ennals.org/images/2021-book-reviews/4027775f9242e9ab.png)

Apparently all statisticians before 1986 would consider M a confounder because it is correlated to X and Y, however there is in fact no causal path from X to Y.

> M-bias puts a finger on what is wrong with the traditional approach. It is incorrect to call a variable, like M, a confounder merely because it is associated with both X and Y. To reiterate, X and Y are unconfounded if we do not control for M. M only becomes a confounder when you control for it!

[This resource](https://cran.r-project.org/web/packages/ggdag/vignettes/bias-structures.html) talks more about this in more detail. And a lot of examples of causal diagrams can be found [here](https://arxiv.org/pdf/1907.07271.pdf).

It turns out that this kind of analysis is very important in many different applications. Look at this example where it is pointed out (p261) that the concepts of "necessary", "sufficient", and "necessary and sufficient" are all related to causality.

> Using these words, a climate scientist can say, "There is a 90 percent probability that man-made climate change was a necessary cause of this heat wave," or "There is an 80 percent probability that climate change will be sufficient to produce a heat wave this strong at least once every 50 years."… Either of these statements is more informative than shrugging our shoulders and saying nothing about the causes of individual weather events.

What got me interested in Pearl is hearing his work mentioned with the idea of "counterfactuals". Counterfactual events are events that could have happened but did not happen. It turns out that for causal reasoning with imperfect knowledge, thinking carefully about counterfactuals can be useful. The details of exactly how are still not quite clear to me. For example, no mentally healthy person could claim to properly understand [this kind of writing on the topic](https://plato.stanford.edu/entries/causation-counterfactual/). But there are important real world considerations.

Pearl is actually kind of down on AI research — no doubt because his academic flavor of it didn’t step into a pile of high visibility commercial success.

> [AI researchers] aimed to build robots that could communicate with humans about alternate scenarios, credit and blame, responsibility and regret. These are all counterfactual notions that AI researchers had to mechanize before they had the slightest chance of achieving what they call "strong AI"…
>
> — p269

But he’s 100% right about that. He further critiques modern AI miracles.

> In technical terms, machine-learning methods today provide us with an efficient way of going from finite sample estimates to probability distributions, and we still need to get from distributions to cause-effect relations.
>
> — p262

This stuff is complicated. The primary motivation to study causality is predicting the future  — how can we avoid the bad situation and cause the good one _in the future_? Predicting the future is obviously complicated, but even talking about how well you did at predicting the future is very tricky. So all of these kinds of discussions are problematic.

I was impressed that Pearl did not accept the state of the art in statistical thinking in 1900 as the last word on the topic. That correlates perfectly with my attitude! I was impressed that he had some plausible ways forward. He is trying to tie in some thinking from other disciplines. I like that approach.

What was disappointing was that none of this is new (he’s already won the Turing Award for it) and I was hoping this book would help me make actionable progress using his strategies. Maybe that will happen for others, but not for me. The best I can say is that I’m aware of this kind of thing now and can follow along with newfangled causal reasoning.

I was also disappointed that there was no explicit algorithms, code or pseudo code examples. That would have helped a lot. It’s easy to find mumbo jumbo on complex math and philosophy topics. Finding some that makes a robot do the right thing injects instant credibility into the conversation.

My suggestion for someone who attempts to write about this topic to a general audience is to go to basics — a gambling game. Can a practitioner of these causal diagram methods invent a gambling game that this kind of analysis is necessary and sufficient to reliably win? That is what casinos do with (and up to the limit of) classic probability calculus.

Maybe when you read the book, you’ll understand things much better than I did. Then, if you think you have a slight handle on causality, I invite you to investigate a much more complex phenomenon highlighted most visibly by small human children — [pretend causality](http://ruccs.rutgers.edu/images/personal-alan-leslie/publications/Leslie%201994a.pdf)! Enjoy!

* * *
