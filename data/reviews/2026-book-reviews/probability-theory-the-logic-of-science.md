---
title: 'Probability Theory: The Logic of Science'
author: Unknown
reviewAuthor: Anonymous
contestId: 2026-book-reviews
contestName: 2026 Book Reviews
year: 2026
publishedDate: '2026-05-21T02:08:14.000Z'
slug: probability-theory-the-logic-of-science
wordCount: 3933
readingTimeMinutes: 18
source: gdoc
tags:
  - Science
  - Philosophy
---

When I was a Ph.D. student, I saw Percy Liang give a talk (then a Ph.D. student at Berkeley, now a tenured professor at Stanford).  I ran into my advisor's office and asked him, "How can I be like Percy Liang, Andrew Ng, and Michael Jordan?"  His answer:  "Percy has read E.T. Jaynes, and you haven't."  So I read it.  This book changed how I think, and it should change how you think, too.

Edwin Thomson Jaynes was born in 1922 and died in 1998, with his masterwork unfinished; it was gathered together by Larry Bretthorst.   The first two chapters are life-changing math.  In Astrel Codex, the subheading is "P(A|B) = [P(A)\*P(B|A)]/P(B), all the rest is commentary."  But E.T. Jaynes doesn't start with Bayes' rule.  E.T. Jaynes _derives_ Bayes' rule from basic principles, basic desiderata for a theory of degrees of belief.  He writes:  

> We would like to think that our minds are swayed not by arguments, but by evidence. And if fallible humans do not always achieve this objectivity, our desiderata were chosen with the aim of achieving it in our robot.

Yudkowsky's article on Jaynes's book is entitled, "[The Level Above Mine](https://www.lesswrong.com/posts/kXSETKZ3X9oidMozA/the-level-above-mine)," and describes Jaynes as a 1,000-year-old vampire.    (I swear I am not making this up.)

> Rather I recognize in Jaynes a level of expertise, of sheer formidability, which I have not yet achieved.  I can argue forcefully in my chosen subject, but that is not the same as writing out the equations and saying:  DONE.

It was [reviewed](https://www.lesswrong.com/posts/KN3BYDkWei9ADXnBy/e-t-jaynes-probability-theory-the-logic-of-science-i) on LessWrong in 2023 by Jan Christian Refsgaard, who wrote, "The book is basically 50% high level math and 50% cool stories and rants that you can mostly understand without the math."  Fair.

Many people think about probability as a sampling process.  P(A|B) maps to some kind of statistics over a set where A is true and B is true, and we are counting things or measuring areas in Venn Diagrams.

>   
> [3Blue1Brown](https://www.3blue1brown.com/lessons/bayes-theorem/) explaining Bayes' rule via areas of sets.  There is nothing wrong with this way of explaining Bayes' rule, especially when starting out.  But  Jaynes points out that a more fundamental understanding of probability as quantifying degrees of belief results in clearer thinking and more powerful tools.![](https://acximages.ennals.org/images/2026-book-reviews/e5ec78db6abd08ef.png)

But fundamentally, probability is not about counting things.  Probability, real probability, is about degrees of belief.  When an event only happens once, we can't sample it.  It doesn't mean anything to count things up.  Instead, we need a more general theory of probability that captures sampling over sets as a special case.  Quantifying degrees of belief is the fundamental thing, and sampling from sets is a derived ability.

But isn't this arbitrary?  If probability is about degrees of belief, aren't I just making up a number on how certain I am about something?  At least with sets, the number comes from somewhere, from counting or measuring something.  Jaynes shows us that no, the numbers are not arbitrary.  Rather, there is a unique system from which we can derive not only Bayes rule, the sum rule, but even unique numerical values for these numbers that represent degrees of belief.  

It should be no surprise that these mathematical ideas are fundamental to all aspects of science (Indeed, at this writing, Astral Codex Ten is the #3 blog in [science on substack](https://substack.com/top/science)), but Jaynes points out that they even have things to say about modern politics:

>   
> "The equations also reproduce a more complicated phenomenon, the divergence of opinions. One might expect that open discussion of public issues would tend to bring about a general consensus. On the contrary, we observe repeatedly that when some controversial issue has been discussed vigorously for a few years, society becomes polarized into two opposite extreme camps; it is almost impossible to find anyone who retains a moderate view. Probability theory as logic shows how two persons, given the same information, may have their opinions driven in opposite directions by it, and what must be done to avoid this."

Rational actors with different priors will diverge even if given the same new information, and Jaynes proves it.   So, God help us, let's try to understand E.T. Jaynes' masterwork, "Probability Theory: The Logic of Science."

# The Basic Desiderata

So what would we like to have in a theory of plausibility or probability?    Jaynes says we would like three things.  And that these three properties, together, are enough to uniquely derive the theory of probability, Bayes' rule, and all its consequences.   He uses the term "plausible reasoning" because we are going to build up step by step towards what we all know as "probability."  (I am going to use the equation numbers from Jaynes' book, in case you want to follow along.)

The first desiderata is hard to argue with:

> (I) Degrees of plausibility are represented by real numbers. (1.28)  

Jaynes adopts the convention that greater plausibility corresponds to larger numbers and a continuity property: if something is a little more plausible, the number should only increase a little bit.  There aren't many other ways to do it.  We could use complex numbers - and then you get quantum mechanics!

The second desiderata is the joker in the deck.

> (II) Qualitative correspondence with common sense. (1.38)

That could hide a lot of hand-waving!  Jaynes intends this to mean that plausibility has to roughly, directionally correspond with logic.  For example, if we learn some new information C' that increases our belief that A is true, it must be that the plausibility of  (A|C') is larger than the plausibility of  A|C.  Additionally, if our belief that A is true given C' has increased, then it must be that our belief that not A is true given C' must decrease.  

The third desiderata is that our robot is consistent, which he operationalizes this way:

> (IIIa) If a conclusion can be reasoned out in more than one way, then every possible way must lead to the same result.(1.39a)
>
> (IIIb)The robot always takes into account all of the evidence it has relevant to a question. It does not arbitrarily ignore some of the information, basing its conclusions only on what remains. In other words, the robot is completely nonideological. (1.39b)
>
> (IIIc)The robot always represents equivalent states of knowledge by equivalent plausibility assignments. That is, if in two problems the robot’s state of knowledge is the same (except perhaps for the labeling of the propositions), then it must assign the same plausibilities in both.

And that's it.  That's enough.  The above conditions uniquely determine the rules by which our robot must reason; i.e., there is only one set of mathematical operations for manipulating plausibilities that has all these properties.  

For me, understanding that the rules of probability derive from these desiderata helped me frame how to use probability both in my research and in my life.  It helped me ask the right questions, because I knew that at the end of the day, all of our reasoning about uncertainty came down to just a few beautiful ideas.

# Bayes' Rule

So we are going to assign a real number to logical propositions, representing our degree of belief in that proposition.  Jaynes asks how we can relate the plausibility of (A and B) to the plausibility of A and the plausibility of B.   Using formal (Aristotelian) logic, we can observe that A and B is the same as B and A - the commutative law.   If we want to think about the plausibility of AB | C, we can first reason about the plausibility that A is true given C, and then the plausibility of B | AC.  Or equally well, we can reason that B is true, and then the plausibility of A | BC.         I will use the notation Pl(A|B) to mean the plausibility of A given information B.  Jaynes uses the term plausibility at this stage, since the word "probability" has a specific technical meaning, and we have not yet derived the rules of probability from our basic desiderata.    Since we must reach the same conclusion no matter which way we do it (by our desiderata of consistency), we can write that Pl(AB | C) = F(Pl(B|C), Pl(A|BC)] = F(Pl(A|C), Pl(B|AC)).   What the function is exactly is not yet specified, but it must have that form or else we can get a different answer depending on which step we take first.   Jaynes gives a lot of examples and intuition for this, but it comes down to the fact that if logical "and" is commutative, then our plausibilities must also respect that commutativity.

To get from this functional form to the product rule, we're going to skip some math. The intuition is that the product rule is the most general functional form that has this property, and that it is required in order to have the consistency that follows from the commutativity and associativity of logical AND - the logical product.

And this is Bayes' rule.  We haven't yet got to probabilities, so Jaynes writes it as w(AB | C) = w(A|C)w(B|AC) = w(B|C)w(A|BC), and Bayes’ rule is just one step away.

My advisor was reading a paper draft once, and my equations were all wrong.  It was before deep learning had taken over everything, and my work was about probability and uncertainty.  H told me, "The equations are the bones of the paper."  If the bones are wrong, everything else is wrong too.  And when you are doing probability, the bones are the product rule and the sum rule.  Everything else is conditional independence assumptions, and the math helps make explicit when you make them.  The first goal is not to fool yourself.

# The Sum Rule

Now we need to get to the actual numbers.  Why do we represent absolute certainty with 1?  Suppose we know that A is true, with certainty.  Now consider Pl(AB|C).   By Aristotelian logic, the truth value of AB=B when we know that A is true.  That is, AB is true if and only if B is true (since we already know A is true).  Therefore, since equal truth values have to have equal plausibility, we can write that Pl(AB|C) = P(B|C) when we know that A is true.

Now consider the product rule.  Pl(AB|C) = Pl(A|C)Pl(B|AC) .  The only way this equation can hold is if Pl(A|C) is the multiplicative identity, 1.

Now consider the opposite, suppose we know that A is false.  Then Pl(AB|C) = Pl(A|C).   Since we know that the logical and AB must be false, it must have the same plausibility as Pl(A|C), which is also false.  By the product rule, this only works if Pl(A|C) is zero, since we don't know Pl(B|AC).

With this, we can derive the sum rule.  Consider the Pl(A|C) and the Pl(~A|C).  A and ~A cannot both be true, so the plausibility of A and ~A must be related in some way.  That is, there must be some relation between Pl(A|C) = S(Pl(~A|C)).    I am going to skip some more math, but the intuition behind it is that this function corresponds to addition, and given our limits between 0 and 1, we get the sum rule: Pl(A|C) + Pl(~A|C) = 1.

We did it!  We started from the desiderata and got to the rules of probability we are all familiar with.  Bayesian or frequentist, all of our familiar rules come from the sum rule and the product rule, which are uniquely specified from our desiderata of real numbers, common sense, and consistency.

# The Principle of Indifference or Maximum Entropy

We have identified how to have numbers for certainty - 0 and 1.  But what about everything in between?  Where do actual numbers representing degrees of belief come from?  We can answer this by introducing the multinomial.  Consider an event like rolling a die, where the outcome is one of six discrete and mutually exclusive propositions, A1 to A6.   Because we must reach the same answers no matter which order we consider the outcome (by our desiderata of consistency), and because equivalent states of knowledge must be represented by equivalent plausibility assignments, the only number we can use to represent the P(A1) is 1/6.   Any other assignment of a number to a degree of belief results in a situation where we can permute the labels on the die and represent equivalent states of knowledge by different numbers.  

Jaynes says:

> We now see that the quantities p define a particular scale on which degrees of plausibility can be measured. Out of all possible monotonic functions which could, in principle, serve this purpose equally well, we choose this particular one, not because it is more ‘correct’, but because it is more convenient; i.e., it is the quantities p that obey the simplest rules of combination, the product and sum rules. Because of this, the numerical values of p are directly determined by our information.
>
> This situation is analogous to that in thermodynamics, where out of all possible empirical  
> temperature scales t, which are monotonic functions of each other, we finally decide to use the Kelvin scale T; not because it is more ‘correct’ than others but because it is more convenient; i.e., the laws of thermodynamics take their simplest form [dU = T dS − PdV, dG = −SdT + V dP, etc.] in terms of this particular scale. Because of this, numerical values of temperatures on the kelvin scale are ‘rigidly fixed’ in the sense of being directly measurable in experiments, independently of the properties of a particular substance like water or mercury.

For me, as a Ph.D. student, these chapters were life-changing.  They gave me a respect for the rules of probability, not as a game we were playing with arbitrary rules and arbitrary numbers, but as a fundamental theory of knowledge, even down to the actual numbers.  I work in robotics.  Jaynes' perspective about quantifying the robot's state of knowledge opened doors to enabling a robot to take deliberate actions that reduce its uncertainty via social actions like asking questions or via physical actions like moving its camera.

# Randomization

Jaynes spends the rest of the book working out standard results in probability following this framework.   He first considers sampling theory, and in particular the Bernoulli urn, sampling without replacement, and derives the binomial distribution.  In a Bernoulli urn, there are N balls, of which M are colored red, and the rest are white.  When sampling without replacement, we ask what the probability is that the first draw will be red?  Using the principle of maximum entropy, we obtain M/N.  Then the probability for red on the first _r_ draws is:

> $$\frac{M!(N-r)!}{(M-r)!N!}$$                                                                     (3.12)

This equation is complicated!  You have to take into account that when you take a ball from the urn, and then do not replace it,  there is then one less ball in the urn for the next sample, leading to those factorials.  

Next, Jaynes considers sampling with replacement. We take the ball out of the urn, observe the color, and then replace it into the urn.  Now the equation is simpler:

> ($$\left(\frac{M}{N}\right)^r$$                                                  (3.92, adapted by me)

Why is sampling with replacement so much simpler than sampling without replacement?   Jaynes writes:

>   
> In probability theory, there is a very clever trick for handling a problem that becomes too difficult. We just solve it anyway by:  
> (1) making it still harder;  
> (2) redefining what we mean by ‘solving’ it, so that it becomes something we can do;  
> (3) inventing a dignified and technical-sounding word to describe this procedure, which has the psychological effect of concealing the real nature of what we have done, and making it appear respectable.
>
> In the case of sampling with replacement, we apply this strategy as follows.
>
> (1) Suppose that, after tossing the ball in, we shake up the urn. However complicated the problem was initially, it has now become many orders of magnitude more complicated, because the solution now depends on every detail of the precise way we shake it, in addition to all the factors mentioned above.  
> (2) We now assert that the shaking has somehow made all these details irrelevant, so that the problem reverts back to the simple one where the Bernoulli urn rule applies.  
> (3) We invent the dignified-sounding word randomization to describe what we have done. This term is, evidently, a euphemism, whose real meaning is: deliberately throwing away relevant information when it becomes too complicated for us to handle.

Jaynes' irreverence cuts straight to the core idea:  we are deliberately throwing away useful information in order to make our computations simpler.  This willingness to throw away information to make our computations simpler is essential to using these ideas in practice.  We must do what the math says, but also let go of what the math says.

# Probability Theory Leads to Political Polarization

> I cannot conceal the fact here that in the specific application of these rules, I foresee many things happening which can cause one to be badly mistaken if he does not proceed cautiously.  
> James Bernoulli (1713, Part 4, Chapter III)

Jaynes promises that the rules of probability can explain how the same evidence can drive the beliefs of different rational agents in opposite directions.  The key comes from their prior information or beliefs.   In this matter, Jaynes anticipates modern AI fakes:

> "Even seeing the event on our screens can no longer convince us, after recent revelations that all major US networks had faked some videotapes of alleged news events."

Jaynes finds many conditions where giving rational actors the same new information can drive their beliefs in opposite directions.  Fundamentally, this occurs when a reporter of the new information is untrustworthy, and when beliefs about their trustworthiness differ.    If the reporter is completely untrustworthy, their positive information (say, about belief in ESP) is not evidence for ESP; instead, it is evidence that the reporter is deceptive.

> These new hypotheses (H1, H2, . . . , H k ) range all the way from innocent possibilities, such as unintentional error in the record keeping, through frivolous ones (perhaps Mrs Stewart was having fun with those foolish people, with the aid of a little mirror that they did not notice), to less innocent possibilities such as selection of the data (not reporting the days when Mrs Stewart was not at her best), to deliberate falsification of the whole experiment for wholly reprehensible motives. Let us call them all, simply, ‘deception.’  
> ....  
> Indeed, the very evidence that the ESP’ers throw at us to convince us has the opposite effect on our state of belief; issuing reports of sensational data defeats its own purpose. For if the prior probability for deception is greater than that of ESP, then the more improbable the alleged data are on the null hypothesis of no deception and no ESP, the more strongly we are led to believe, not in ESP, but in deception.

Jaynes found this effect himself when one of his research results yielded a larger than expected improvement over the baseline:  because of the size of the improvement, people in the community did not initially believe their results:

> Indeed, in the course of writing this chapter, the writer found himself a victim of this phenomenon. In the 1987 Ph.D. thesis of G. L. Bretthorst and more fully in Bretthorst (1988), we applied Bayesian analysis to the estimation of frequencies of nonstationary sinusoidal signals, such as exponential decay in nuclear magnetic resonance (NMR) data or chirp in oceanographic waves. We found – as was expected on theoretical grounds – an improved resolution over the previously used Fourier transform methods. If we had claimed a 50% improvement, we would have been believed at once, and other researchers would have adopted this method eagerly. But, in fact, we found orders of magnitude improvement in resolution. It was, in retrospect, foolish of us to mention this at the outset, for in the minds of others the prior probability that we were irresponsible charlatans was greater than the prior probability that a new method could possibly be that good; and we were not at first believed.

Thus, we see the polarization in politics.  The new information about climate change, homelessness, or the election fraud is not that "a certain event happened in a certain way; it is that some news reported has _claimed_ that it did."  

> In politics, we have a very different situation. Not only do we doubt a politician’s promises, few people believe that news reporters deal truthfully and objectively with economic, social, or political topics. We are convinced that virtually all news reporting is selective and distorted, designed not to report the facts, but to indoctrinate us in the reporter’s socio-political views. And this belief is justified abundantly by the internal evidence in the reporter’s own product – every choice of words and inflection of voice shifting the bias invariably in the same direction.

Suppose person A believes a hypothesis to be true (say, that Global warming is real), and person B believes it is false (Global warming is made up by the libs.)  Now both people receive a new piece of information, H.  Jaynes shows that depending on prior beliefs, this new piece of evidence could result in A continuing to believe in H and B continuing to disbelieve it; or could result in both A and B believing in global warming; or it could result in A and B disbelieving in global warming, or even cause their relative beliefs to swap, so that person A (the Global warming believer) now doubts it, while the doubter thinks it is real!  All from the same piece of new information!   And in each case, they are reasoning as rational agents, updating their beliefs based on new information.

So I just assumed the reversal could happen.  Here is how.  Suppose that person A believes everything Trump says is false, while person B has prior information that everything Trump says is true.  The new information is that Trump says climate change is real.  Now person A will believe the inverse, that it is false, while person B will change their belief to align with Trump.

In this sense, everything is relative.  No one piece of information leads to the Truth; how we incorporate it to update our beliefs depends crucially on our existing beliefs.    Where did this take me?  Through math, empathy.  A rational actor does not necessarily have their belief moved in the same direction as mine by a piece of evidence.  To appreciate others' perspectives, I have to understand their beliefs, their assumptions, and their world.

# Conclusion

Through math, empathy. That is what this book did to me.  When I ran into my advisor's office asking how to be like Percy Liang, I thought the answer would be a technique, an algorithm, a paper to read and implement. Instead, it was a way of thinking. Jaynes taught me that probability is not a tool we apply to problems — it is a theory of knowledge, of what it means to believe something in the face of uncertainty. Once you see it that way, you cannot unsee it.

You start asking different questions. Not "what is the probability?" but "whose probability, given what prior information?" You start reading the news differently. You start listening to people you disagree with differently — not to refute them, but to ask what prior beliefs could make their reasoning coherent. Often, you find them.

Read this book. It will change how you think.
