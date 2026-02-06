---
title: "The Tyranny of Metrics by Jerry Z. Muller"
author: "Unknown"
reviewAuthor: "Anonymous"
contestId: "2022-book-reviews"
contestName: "2022 Book Reviews"
year: 2022
publishedDate: "2026-02-06T07:21:54.174Z"
slug: "the-tyranny-of-metrics-by-jerry-z-muller"
wordCount: 1533
readingTimeMinutes: 7
originalUrl: "https://docs.google.com/document/d/1hFzjXliCAWjvheY-8Qd2fhbF79LnX0Xg6R9eqk9yIyI"
source: "gdoc"
---

sets out to investigate how metrics became ever present in private and public organisations, and how introduction of metrics can lead to unintended consequences.

I’ve picked up the tyranny of metrics as a counter-balance to “How to Measure Anything” by Douglas W. Hubbard, a book that has convinced me to join the “measure everything!” club. Tyranny of metrics did not convince me to leave that club.

The book could have been called “Goodhart’s law: examples”. For those unfamiliar, [Goodhart’s law](https://www.google.com/url?q=https://en.wikipedia.org/wiki/Goodhart%2527s_law&sa=D&source=editors&ust=1770366106708649&usg=AOvVaw3KsG2TfwFHYGeu3pTZF63-):

Any observed statistical regularity will tend to collapse once pressure is placed upon it for control purposes.

better known through Marilyn Strathern’s generalisation:

When a measure becomes a target, it ceases to be a good measure.

That’s basically the whole argument of the book, followed by a hundred pages of examples.

The examples all follow the same pattern:

1.  There is a desire to distinguish between low quality and high quality and there is a desire to push for higher quality.
2.  A metric for a proxy of quality (test scores, number of crimes, surgery outcomes) is introduced.
3.  People’s pay becomes based on the metric.
4.  People optimise for the metric, instead of quality.
5.  Quality is reduced, work becomes a nightmare, everything is terrible.

The outcome seems predictable, but is it avoidable? Muller suggests using “judgement”, without going into detail, I think we can do better.

## How to distinguish between low quality and high quality?

Let’s see if we can derive a better metric for one of the examples from the book.

When confronted with a difficult measurement, “How to measure anything” recommends asking “what is the decision this measurement is supposed to support?”.

For a prospective student, the quality metric for a college will be used to decide whether to apply to that college or not. This is one of the U.S. Department of Education’s [College Ratings Framework](https://www.google.com/url?q=https://www.ed.gov/collegeratings&sa=D&source=editors&ust=1770366106710380&usg=AOvVaw1qe_k5ccH4otKOPQ6FLI85) purposes:

To provide better information about college value to students and families to support them as they search for select a college,

College Ratings Framework has a broad set of metrics, some that are relevant to the student’s application decision are: “Labor Market Success” (median annual earnings of students … after graduation) and “Completion Rates”. Tyranny of metrics describes some problems these metrics create: belief that more education is better (average earnings with a bachelor degree are higher than without it) and lowering standards to increase completion rates, among others. I think these issues are in part caused by the use of metrics that are proxies for probabilities of events, instead of probabilities of events. For desirable events, higher probability means higher quality, and for undesirable events the other way around.

A student choosing to apply to a college might care about “getting a job as a surgeon in the U.S. with a salary above 300000 USD per year” or “performing a surgery in the U.S.” (for those who go into the field for reasons other than pay). Colleges should be able to provide predictions on such events (I expect each college would have a small set of events for which they would be able to provide predictions) for every applicant and track and publish outcomes of these predictions.

Providing these predictions would require a deep understanding of both the students and the teaching methods, but presumably that’s something colleges should care about anyway. As Lord Kelvin once said

When you can measure what you are speaking about, and express it in numbers, you know something about it; but when you cannot measure it, when you cannot express it in numbers, your knowledge is of a meagre and unsatisfactory kind: it may be the beginning of knowledge, but you have scarcely, in your thoughts, advanced to the stage of science, whatever the matter may be.

Would this metric help against the problems mentioned above? Distribution of probabilities of events that students care about (like achieving employment with a specific salary) might show that there is a significant risk of net loss for students, which should make generalisations like “more education is better” less convincing. There should also be less of a push to lower standards to improve completion rates, since lowering standards decreases probability of other events students care about (like achieving employment with a specific salary).

Using probabilities of events and prediction accuracy (see [Brier score](https://www.google.com/url?q=https://en.wikipedia.org/wiki/Brier_score&sa=D&source=editors&ust=1770366106712961&usg=AOvVaw18T2Lzzjpbx0tHWo4XYwrj) and “Superforecasting: The Art and Science of Prediction” by Philip E. Tetlock for more on prediction accuracy) as main metrics for quality seems to have some nice properties:

1.  Tracking of prediction accuracy forces models to self-correct (situation in the labour market changed and now getting a job with a specific salary is less likely? gotta update that model).
2.  Models used for prediction of events can be better fitted to local circumstances (avoids “one size fits all”).
3.  Using accurate models might show that events (that people care about) in particular circumstances might be too unlikely, and can force someone to reconsider their decision thresholds (“my chances of completing a degree at college C1 and then getting employment with salary X are low, but my chances of completing a degree at college C2 and getting employment with salary X/2 are much higher; given my level of risk aversion, I’ll settle for higher chance of employment with salary X/2“).
4.  Gaming predictions (by overestimating or underestimating on purpose) makes less sense, both due to prediction accuracy tracking and better acceptance of failure due to the use of language of probability (“we predicted that you are only 20% likely to complete your degree, you took that risk and it didn’t work out, alas”).

I think this approach can be applied in almost all of the examples in the book, although if “pay for performance” is used, there will still be pressure on how to record outcomes of predictions.

## How to push for higher quality?

The tyranny of metrics gives lots of examples of “pay for performance” (metric goes above target, moneys paid go up) leading to terrible outcomes, and that seems only natural, you get what you pay for. From over-fitting(give more funding to colleges with higher completion rates, everything is sacrificed for completion rates) to manipulating recording of outcomes(did that student that dropped out ever actually apply?), it all gets pretty bad(college education doesn’t have chilling examples, but policing and medicine do).

Can we do better? Maybe we can.

Some combination of “The New Economics” by W. Edwards Deming and “Thinking in Bets” by Annie Duke led me to something I call “pay for process”.

If probabilities of events (that people care about) are used as a metric of quality, the influence of specific processes on that probability can be estimated.

Is a college doing something that they estimate will increase the probabilities of events (that students care about) for some group of students (for example, “students from low socio-economic status background”)? Are they planning to? Do they have a backlog of changes to their processes? A benefactor that chooses where to allocate funding can decide whether a specific college is trying to do the right thing for increasing probabilities of events (that students care about) for some group of students, and allocate funding based on that. Note that some changes in processes will have a lower chance of success, and results of some changes might take a very long time to materialise. Different benefactors could have different levels of risk aversion and time horizons on which they would expect to see results, and these benefactors could choose different colleges to fund.

Is an employee increasing the probability of a process influencing probabilities of events (that people care about)? An employer that decides which retention measures to use for an employee, can decide based on employee value (through their participation in processes), probability of employee leaving with particular retention measures and the cost of these measures.

The important bit here is to not use realised outcomes when deciding pay. Penalising people for doing what they (reasonably) believe is the right thing and failing makes exactly as little sense as rewarding people for doing the wrong thing and succeeding.

## What if?

There was one example that I tried to keep in mind while writing this post, a police detective who “sought to meticulously build a case against top drug lord” but was instead pushed by his superiors into “arresting five teenagers a day selling drugs on street corners”. How would this look if the police structure in which the detective worked used probabilities of events as metrics and “pay for process”?

Some of the relevant events (that people would care about) in this example are “being a victim of theft, robbery or burglary in a given year”. Does arresting teenagers selling drugs influence the probability of such events? How much? How does that compare with arresting drug lords? With pay for process, superiors of that police detective would need to be able to answer these questions, and they would need to enable the processes that they believe would influence that probability the most. Perhaps meticulously building cases against top drug lord is the right thing to prioritise, if it is, then in this scenario it would be.

* * *

* * *