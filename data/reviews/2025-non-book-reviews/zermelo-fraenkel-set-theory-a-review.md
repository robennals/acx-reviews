---
title: 'Zermelo-Fraenkel Set Theory: A Review'
author: Unknown
reviewAuthor: Anonymous
contestId: 2025-non-book-reviews
contestName: 2025 Non Book Reviews
year: 2025
publishedDate: '2026-02-06T16:55:59.408Z'
slug: zermelo-fraenkel-set-theory-a-review
wordCount: 5797
readingTimeMinutes: 26
originalUrl: >-
  https://docs.google.com/document/d/1jYVJFIz5-aMi0LCgsC9AN6BncJDNVGaMU37QmwZ1vzA
source: gdoc
tags:
  - Science
  - Philosophy
---

ZFC is Zermelo-Fraenkel Set Theory with the Axiom of Choice, the most common foundational system for mathematics in use today; though most working mathematicians never give much of a thought to foundational issues, ZFC is the “received foundational system”—the system of axioms we all know we're supposed to be able to translate our theorems into if asked, not that anyone ever actually bothers.

So what does it mean to review an axiom system–a purported foundation for mathematics? I'm not going to try to convince you all to adopt it or a competitor in your daily life. There will be no rating out of five stars at the end. Though admittedly a bit of a gimmick, my plan to review ZFC was inspired by [this](https://risingentropy.com/zfc-as-one-of-humankinds-great-inventions/) post, suggesting ZFC as one of the great achievements of humanity. In my review I hope to give you a sense of why someone might think that way. I'll also try and gesture at some of the issues people have with ZFC—ZFC has been criticized as being both too weak and too powerful, and I hope to give a sense of what people mean when they offer these criticisms.

A final word before the review starts for real: though I have a PhD in math, I am no longer a professional mathematician, and I never worked in set theory or mathematical logic. I am reviewing ZFC not as a connoisseur or expert, but hopefully also not as a complete bumbling incompetent. For obvious reasons I will skimp on the rigour, but I hope the real experts won't find anything wrong in what I say. They will however, necessarily find much that is oversimplified and incomplete.

## WTF is ZFC?

So, what is ZFC? ZFC is a system of rules, or axioms, governing a certain kind of mathematical object, “sets”. The rules tell us what we’re allowed to do with sets, how we can combine sets, how we can make new sets from old sets. So it probably helps to start with what a set is.

The naive idea of a set (that is, a concept of sets without a full axiomatization a la ZFC) emerged in the mid-late 19th century from the work of Cantor and Dedekind. There is much (much!) to say about this, but the intuitive core is that a set is a collection of objects; we'll see later we may need to take some care about what counts as an allowable “object” for a set, but in naive set theory we don't know that yet. The objects inside a set are called its “members” or “elements”, and if an object a is in a set S, we denote that a∈S (read this as: a is in S” or “a is a member of S”) . We can also write a set explicitly by putting its members inside curly brackets, like so: S\={x,y}— this says that S is a set whose members are x and y, whatever those are. So we can also say x∈S, y∈S.

We mostly consider the members of a given set to be other sets (many of the examples  that follow will seem to be sets of numbers, but actually there are clever ways to recast sets of numbers as sets of sets); many of the axioms of ZFC turn out to be related to helping us with certain “starting sets” that we can use to build other sets; telling us how to take the sets we already have and make new sets; and what restrictions there are on which sets can be members of other sets (i.e., can a set be a member of itself?)

For those of you who don’t care enough for the details, you can skip the rest of this section after this paragraph, but before you go, I want to emphasize: the axioms are there to bind the process of working with sets in rules that give you a certain selection of starting sets, and procedures for generating new sets from those other sets. Importantly, the rules are often restrictive in the sense that you can only apply the rule to a set that you are already imagined to have: with only a few exceptions, you can’t conjure sets out of nothing, you conjure sets out of other sets, and ZFC states the constraints on this process.

So, what are the ZFC axioms?

The first axiom of ZFC tells us that sets are defined by their members: two sets with the same members are equal as sets; and membership is not a property that allows multiplicity: you're either a member of a given set, or not; there's no such thing as being a member twice, or anything like that. So {x, x}={x}: these are both just a set whose only member is x; the fact that I've listed the one member twice in the first instance is meaningless. We also ignore the order in which we list membership: {x,y}={y,x} because these are both just the set containing members x and y.

The next few axioms tell us how we can create new sets out of old sets by combining the members in each set together.

One axiom tells us we can always take the union of sets, we can collect up the members of two sets and combine them into a bigger set. The union of two sets is denoted by the symbol ∪  and it’s important to remember that if some member is in each of the two sets whose union we are calculating, because order and number don’t matter, that member only appears once in the union.  

So, as a quick example: if S={x,y},T={y,z} then S∪T\={x,y,z}.

Another axiom tells us that given two sets x and y, there is always a set containing these two sets as members. Crucially, x and y don’t have to be different: our two sets can be x and x again, so the set containing these is the set {x,x}={x}—so this axiom also tells us that given any set x, there is also a set containing that set.

Another axiom that we can use to build new sets from old is the power set axiom, which says that given a set, we can make a set consisting of all of its subsets: each way of taking the members of our initial set and combining them into sets.

So, if S={x,y,z} then the power set of S is

P(S)={ {}, {x}, {y}, {z}, {x,y}, {x,z}, {y,z}, {x,y,z} }—each of the sets inside the big set has only members that are also members of S. You’ll also observe the first of those listed sets is a set with no members at all–we’ll come back to this later, but for now I’ll only justify its inclusion as a subset of S–and hence a member of the powerset–by the observation that it is the subset obtained by taking none of the members of S.

Note that so far, none of our axioms guarantee that there are any sets at all: they just tell us ways to make new sets out of sets we already have. The next axiom changes that: the axiom of infinity asserts that there is a set with infinitely many members. The exact details of this infinite set can depend on how the axiom is formulated, but usually the infinite set is axiomatized so that one can relatively easily find a copy of the natural numbers inside. Thus it's only slightly wrong to think of this axiom as saying, “the set of natural numbers exists”.

The next few axioms are a little technical, but we'll see that they're very powerful.

First, the Axiom Schema of Restricted Comprehension says that, given a set z, and some description/property/specification ϕ, we can form the set of all members of z that satisfy ϕ.

A few notes about this one: first, this isn't one axiom, it's an axiom schema: there's one axiom for each possible ϕ. I’m being deliberately vague about what exactly ϕ is allowed to be–but you should think of these as statements like “is even”, or “is odd”, or “is prime”, if z is a set whose members are natural numbers. Or, it can stand in for statements like “has three elements”, or “has infinitely many elements” if z is a set of sets. So, this says something roughly like, “given a set of numbers, we can make a new set consisting of all the even/odd/prime members of our initial set”; or “given a set of sets, we can pick out a new set of all the members of the initial set with three/infinite/… elements”.

Second, we can use this to show that one set that must exist is the empty set: the set with no members. To do this, take a set z, and a property ϕ that none of the members of z satisfy (say, z is the set of even numbers and ϕ is the property of being odd—then this says there is a set consisting of all the odd members of the even numbers, which clearly is a set with no members at all).

Finally, note how we have to have a previously existing set in order to do this: we can't get new sets completely for free; we need to reuse sets that are already somehow available to us. We'll discuss this more later.

Having used the previous axiom to show that there is an empty set, we can easily state the next axiom:

Every set x other than the empty set contains at least one member y, such that x and y have no members in common.

This is the Axiom of Foundation, and we'll shortly see that it is used to outlaw “self-referential” sets: sets that contain themselves, giving a sort of infinite regress.

Next is another axiom schema, and a very powerful one; this axiom was not in Zermelo’s original set theory—it was suggested by Fraenkel (and, independently Thoralf Skolem, though it seems that only the former version garnered enough attention to get a name attached) to give set theory sufficient power to recreate some of the constructions of Cantor in naive set theory. This is the Axiom Schema of Replacement, and it says:

If x is a set, and we have a function ϕ that maps the members of x, then there is a set y containing ϕ(a) for all a∈x.

In plainer language: if we have some method of transforming the members of a set according to some rule, then the transformed versions of every member of the original set constitute a set themselves.

Finally, the axiom that puts the C in ZFC, the Axiom of Choice: Given a (possibly infinite) collection of sets, each of which has at least one member, there is a new set whose members consist of one member chosen from each of the original sets.

This axiom is required for cases where there is no rule-based procedure for picking a member from each of the sets; a famous quip of Bertrand Russell asserts that given an infinite number of pairs of shoes, one doesn’t need the axiom of choice to pick one shoe from each pair–you can state a rule that singles out one element from each pair, say “pick the left shoe”. But you do need the AoC for picking one from each of an infinite number of pairs of socks: there is no rule-based way to single out one sock from each pair. If you imagine a procedure where you iterate through each pair of socks, picking one at random, the problem is you will never complete that process: the AoC of choice is what lets you say, “okay, but imagine somehow completing that process”--it says you’re allowed to act as if you could go through each of the infinite pairs by hand and select one, and collect all of your choices up into a new set.

## A Canned and Highly Selective History of Set Theory

So, why these rules? Why any rules? Why sets at all?

To take these in reverse order: in the late 19th century, particularly in the hands of Georg Cantor, the theory of sets seemed to open up mathematics to strange new vistas. The history here is too interesting and detailed to do any real justice to, but the quick version is that Cantor used a version of naive set theory–that is, set theory without formal rules like ZFC–to prove amazing facts that seemed to come out of nowhere.

The most famous of Cantor’s proofs is that there are different sizes of infinity. More specifically, he defined a measure of a set’s size (that is, its number of members) called its cardinality. So, the cardinality of a set with three elements is 3; the cardinality of a set with ten elements is 10. So far, so boring. But he also showed that, under his definition, different sets of infinite size came out with different cardinalities. For example, the set of natural numbers, {1,2,3,...} has a cardinality that Cantor named ℵ0 (read “aleph-nought”). Meanwhile, the set of all real numbers–all infinite decimals–turned out to have a strictly larger cardinality. And it didn’t stop there: remember the power set operation, the axiom that said “given a set, you can make the set of all its subsets”? That operation always creates a bigger set–even if you start with an infinite set, its power set will have a cardinality that is even bigger.

Cantor also proved that infinite cardinalities are linearly ordered: after each infinite cardinal comes a next infinite cardinal, which immediately prompted him to ask, “is there a cardinality bigger than that of the natural numbers, but smaller than that of the real numbers?” It frustrated Cantor to no end that he was unable to prove that there was no intermediate cardinal. The hypothesis that there is no such intermediate cardinality became known as the Continuum Hypothesis.

Cantor also considered ordinal numbers, which describe how numbers are ordered. In the list 1, 2, 3, …. 1 is the first ordinal, 2 is the second, 3 the third… But what if we order the numbers so that we first list all the even numbers, and then the odds:

2, 4, 6, …., 1, 3, 5, …

In what position does 1 appear? The theory of ordinal numbers is a formal way to discuss such things. I wish I had the space to go into detail about this, because it’s strange and fascinating, but all I will do is point you to [John Baez](https://johncarlosbaez.wordpress.com/2016/06/29/large-countable-ordinals-part-1/) and recommend you at least get a taste of this bizarre, infinite world.

All this new stuff about infinity was very strange, but also interesting and new and productive. Mathematicians disagreed on how to feel about this strange new world Cantor had opened up to them, but most agreed that there was something compelling about it. Even beyond the novelty of exploring the infinite, set theory seemed to open up a new world in which to do mathematics; a world in which one could do things that no mathematician would have dreamed of otherwise. David Hilbert, one of the leading mathematicians of the late 19th and early 20th centuries, summed it up when he said, “no one will expel us from the paradise that Cantor has created for us”. Cantor’s set theory was a mathematical Eden. But there was a serpent lurking in the garden…

In the early 20th century naive set theory was rocked by a series of crises.

First, and skipping the details, Cantor and Cesare Burali-Forte respectively showed that the concepts “the set of all cardinal numbers” and “the set of all ordinal numbers” led to paradoxes—in a sense, there are “too many” cardinal and ordinal numbers to be collected up into sets without running into paradoxes.

The other major paradox is a little more intuitive, and relied on the fact that naive set theory was sloppy when it came to defining sets: in naive set theory you could happily have sets that contain themselves, or define a set by saying “the set of all things with property X”, and not worry too much about what X actually stood for: “the set of all even numbers”, “the set of all prime numbers”, and so forth are examples of this construction. Notice how, unlike the ZFC axioms, this construction does not require that the members of these sets come from pre-existing sets.

Bertrand Russell brought an end to this by pointing out the following paradox: if you're allowed to define sets in any way, there's no reason you can't have a set one of whose members is itself. If this seems too abstract, consider something like, “the set of all sets with more than one member”. Since there is more than one set with more than one member, “the set of all sets with more than one member” itself has more than one member, and so is contained in itself. This is definitely a little weird and “loopy” but it certainly feels like a somewhat natural definition.

But now, says Russell, consider another self-referentially-defined set, the set of all sets that do not contain themselves. Now we ask the killer question: is this set a member of itself?

First, suppose it's not. By not being a member of Itself, this set satisfies its own defining property, so it is a member of itself.

Or, suppose instead this set is a member of itself. Then it fails to satisfy its own defining property, and so it can't be a member of itself.

Whichever supposition we make, we are immediately forced to conclude the opposite! This is a paradox—it has the same basic structure as the famous liar paradox, in that each way of evaluating its truth forces the opposite. The logical structure swallows its own tail, constricts down to a point, and explodes! Something has gone wrong, probably related to our carelessness at defining sets. Russell's paradox proves that we need some rules governing how we define sets, otherwise we're at risk of paradox.

In particular, to re-enter Cantor’s garden, we need rules that restrict if or how sets can be members of themselves, and in what cases we can define a set in terms of some property that its members satisfy.

But we also don’t want our rules to be too restrictive: we want enough power and freedom to do all the stuff Cantor was doing with infinities; we want all of his cardinals and ordinals, and all the stuff that made naive set theory Edenic in the first place.

ZFC is an attempt to thread this needle: to put enough restrictions on set theory to banish the paradoxes, but not so many restrictions that set theory becomes boring.

## Why you should like ZFC

Let’s first see how ZFC avoids Russell's paradox. We got Russell's paradox by taking a property, “not being a member of oneself”, and then immediately demanded a set whose members satisfy that property. In naive set theory, just by naming the property, we expected to have the set. In ZFC, the Axiom of Restricted Comprehension says we can do that as long as we already have a set z, containing the things we want to subject to this property. In other words, we can't just order up “the set of all blah-blah-blah that have property so-and-so”—we need to order our blah-blah-blahs from somewhere; they have to already be found in some other set, from which we merely extract the so-and-so members. So long as we never allow any paradoxical items in that initial set z, then asking for the ones that satisfy a certain property can't create a paradoxical set.

The axiom of foundation also helps us out: it prevents sets from being members of themselves. It also prevents “infinite regress sets” of the form {{{{…}}}} where we don't let it “bottom out”.

So we can see how some of these axioms help with the first of our desiderata: banishing the paradoxes.

On the other hand, the Axiom of Infinity and the Axiom Schema of Replacement (the one that earned Fraenkel his place on the marquee) are there to make sure our set theory isn’t too restrictive. The Axiom of Infinity is obvious: it’s there to give us a big enough set to do stuff with infinity; this seems like an obvious prerequisite for Cantor’s exploration of different-sized infinities. The other one, Replacement, is there to allow us to recreate Cantor’s work on ordinals. Without it, the process of creating infinite ordinals gets stuck much earlier than in naive set theory; you need Replacement to get past a certain obstacle and keep going.

The other axiom worth making a bit of a big deal about is the last one, the Axiom of Choice. This is the “C” in “ZFC”. We will see that this is one of the most controversial axioms, although others have also attracted controversy. Because this is the “what’s good about ZFC?” section, I’ll only mention the positives of the Axiom of Choice. First and foremost: it’s powerful. Lots of things can be proven with choice that you can’t get without it. What’s more, many of the things you can prove are highly intuitive: they seem really obvious; even if you don’t find the axiom itself appealing (which many people do), almost everyone wants vector spaces to always have bases (if those words mean nothing to you, don’t worry, but I promise you that’s an extremely appealing thing), which only happens if the Axiom of Choice is true.

So, ZFC is powerful: powerful enough to recreate much of Cantorian set theory, but without the paradoxes.

Because this is ostensibly a review, let’s pause for a moment here and admire this fact. Georg Cantor came up with a formulation of mathematics that seemed to push to the very edge of human understanding: he found multiple endless towers of rising infinities; he inspected the very foundations of the system of numbers; he proved theorems that most mathematicians before him couldn’t have even imagined. It’s no surprise he was a little cracked, and it’s no surprise the mathematics he used was also a little cracked; how can you hold up a mirror to the multiply-infinite nature of mathematics itself without that mirror cracking?

The story of Cantor is basically a Greek myth: Cantor flew too high; got too close to the fire of the Gods; take your pick. He tried to look at the foundations of number and infinity without first hiding himself in a cleft in the rock, so of course it was all too good to be true.

Cantor’s wings melted, but Zermelo (with assists from Fraenkel, Skolem, von Neumann who contributed the original form of the Axiom of Foundation) offers up instead a pair of asbestos wings. Less powerful than Cantor’s, but still airworthy enough to reveal the vistas that Cantor saw; and robust enough not to melt and send us plummeting into the sea of mathematical paradox.

The other thing I, personally, find striking about ZFC is something that emerges when compared to the other great monument to the strangeness and beauty of our world from the earliest 20th century, quantum mechanics. Quantum mechanics, despite being from the realm of physics rather than the (presumably) more fundamental realm of mathematics, has a much more unchosen quality to it–there are alternative flavours of quantum mechanics, but my impression is that constructing truly other versions of quantum mechanics is much more of a dead end than constructing alternate set theories. ZFC is not forced on us by experiment the way QM is; it has much more of the character of something made by human beings–or at least: chosen by human beings. Perhaps curated. The choice of set theory axioms feels to me to have something in common with gardening: there are real constraints, and real consequences to our choices, but there is an aesthetic vision that guides the choice. A sense of taste. And ZFC, while not strictly to everyone’s taste (as we’ll see below) strikes a delicate balance. There is a certain elegance to it, in the way it both enables truly mind-bending mathematics, and yet doesn’t just brute force assert answers to all of our questions (again, as we’ll see below).  

## What’s bad about ZFC?

So, after that paean, what could someone object to?

Let’s start with objections that ZFC is too powerful: some of the axioms are too strong, unnecessary, unintuitive.

Finitists reject the Axiom of Infinity. Roughly speaking, while a finitist can accept sets of any finite cardinality, they reject sets of infinite cardinality. A finitist believes in each individual natural number, but not in the set of natural numbers. Most mathematicians aren’t finitists, but I’ll confess to having a soft spot for it; infinity really is pretty weird!

Another axiom to reject is the Power Set Axiom. Nik Weaver is a mathematician who objects on the grounds that it is non-constructive: many of the axioms, like Restricted Comprehension and Foundation, are there to give ZFC an “iterative” character—ZFC lets you build sets out of sets you already have “lying around”, but it doesn’t like to give you sets “out of nowhere”—there are a few times where ZFC stipulates the existence of a set (e.g. the Axiom of Infinity), but mostly it likes you to build using materials already at hand. But when constructing the power set of an infinite set, Weaver thinks ZFC hands you too many sets for free—Weaver suggests that the power set is only sometimes an allowable operation. For example, he suggests the power set of the natural numbers is kosher, and so is its power set, but that we might not want to allow power sets after this point. According to him, most mathematics that is done by non-set-theorists doesn’t actually require anything beyond this point: ZFC gives way more sets than are necessary.

Perhaps the most controversial axiom is the final one, the Axiom of Choice, again often on “constructivist” grounds. Some people feel that without a “natural” way to specify which member of each of an infinite collection of sets to choose, no such choice can be specified. Recall Russell’s quip about socks: if you can’t specify a rule like, “take the left one”, how are we imagining a choice procedure to ever finish?!

It is also the case that the Axiom of Choice has some very strange, unintuitive consequences. Some of you will have heard of the Banach-Tarski paradox, which uses the AoC to take a ball of a certain size, cut it into pieces, and rearrange those pieces only by moving and rotation (i.e., no stretching or anything that should change the shape or size of the pieces) to get two balls of the same volume. Somehow, by chopping it up and moving it around, we get double what we started with. If that seems wrong to you, you are troubled by the Axiom of Choice.

 When I first learned set theory, I was told that “everyone thinks the Axiom of Choice is obviously true; the well-ordering principle is obviously false; and who knows about Zorn’s lemma?”—the joke being that each of those is actually equivalent to the Axiom of Choice. Depending on how you present it, peoples’ intuitions respond very differently. So, perhaps an axiom this unintuitive should be treated with skepticism.

Finally, it is often pointed out by those who think ZFC is overpowered, that a surprising amount of mathematics can be done with much weaker machinery. As already noted, Weaver claims that a drastic weakening of the Power Set Axiom is still sufficient for most “practical” mathematical purposes.

The program of reverse mathematics aims to understand how much mathematical sophistication is necessary to prove certain mathematical results. One of the originators of reverse mathematics, Harvey Friedman, formulated a so-called Grand Conjecture that “Every theorem published in the Annals of Mathematics whose statement involves only finitary mathematical objects (i.e., what logicians call an arithmetical statement) can be proved in EFA [a much weaker system than ZFC].”

It can seem that, unless you are doing complicated set theory, ZFC is a nuclear bomb when a hammer will do.

On the other hand, there are ways in which ZFC is underpowered.

Remember Cantor’s frustration at being unable to prove the Continuum Hypothesis? It turns out, he shouldn't have felt too bad about himself: the Continuum Hypothesis is undecidable in ZFC–it cannot be proven either true or false using the axioms of ZFC.

Nevertheless, many mathematicians still believe that the CH is in fact either true or false, and the fact that it's out of reach for ZFC is an indication that ZFC is not strong enough: we should be working with a stronger axiom system. The great logician Godel (whose role in this story I have suppressed for brevity’s sake, unfortunately) believed the CH to be false, and that ZFC wasn't a strong enough axiom system to adequately characterize the universe of sets.

One remarkable fact that supports this point of view is the following:

There are certain infinite cardinal numbers that one can define in terms of various combinatorial properties, but that cannot be proved to exist using the axioms of ZFC. These are called “large cardinals”, and boy howdy, they are large.

Even though these cardinals cannot be proven to exist by ZFC, if one takes the existence of such a cardinal with certain properties as a new axiom, one gets a new, stronger theory: ZFC + your large cardinal axiom. Remarkably, so far these cardinals seem to all have the property that the strengthenings of ZFC that result from them yield a chain of increasing strengths—i.e., these axioms which are motivated by the combinatorial definitions of the large cardinals they assert–definitions which have no obvious connection to the strength of the implied theory–seem nevertheless to create a natural chain of strengthenings of ZFC, almost as if we have stumbled upon a naturally occurring feature of ZFC, that it yields these orderly extensions. Many mathematicians take this as evidence that one of these large cardinal axioms may just be true; that if not ZFC itself, then some particular strengthening of it, is the right strength of axioms.

## Final Thoughts

So, what to make of this? Is ZFC too strong? Too weak? Just right? Should you all regard ZFC as the one true foundations of mathematics?

My takeaway is that ZFC is like James Joyce’s Ulysses, or Finnegan's Wake. Those aren't books that most people will get much out of; it would be crazy to say that one “should” read them—and even many who do read and enjoy them will agree that there's much that's extraneous, or baffling. But their very existence is a testament to the human spirit; to our creativity and inventiveness. So too, the average person—even the average mathematician!—doesn't need to know very much about ZFC. For most of us, something much weaker will suffice for our daily demands. But that doesn't mean that ZFC is sterile, a playground for the most logic-brained pedants and nothing more. It's an extraordinary attempt to rescue as much of the foundational-ness of naive set theory as possible while excluding the paradoxes—to keep the freedom and intuition and power of Cantorian set theory but with just enough extra rules to tame it into something lawful.

You don't have to agree that it navigates those pressures in just the right way. You don't have to agree that there is a right way. But I think you do have to admit that ZFC is an elegant solution to those pressures: it is powerful enough to prove arithmetic, and do Cantor’s weird and wonderful things with infinities; but (with the possible exception of the Axiom of Choice) it doesn't just arbitrarily add axioms to get to a certain desired power. While some people feel that the undecidability of the Continuum Hypothesis in ZFC shows that there is yet some natural axiom missing, I kind of feel the opposite: it shows that ZFC didn't put “too much in by hand” and the result is a system that is balanced between two possibilities in a surprisingly beautiful way.

I said before that unlike quantum mechanics, one’s choice of a foundational system of mathematics feels to me to be ultimately a matter of taste. I am not enough of a connoisseur of foundational systems to really discriminate between ZFC and its competitors; my level of snootiness doesn’t rise beyond the equivalent of “ordering the house red”. But one thing about ZFC that appeals to my taste at least, is that it’s a foundation system that still has space for that ambiguity about the Continuum Hypothesis. There’s something ineffably beautiful to me about the fact that the axioms of ZFC don’t totally banish all the mystery from Cantor’s paradise.

* * *

[[1]](#ftnt_ref1) I remain baffled by how Card’s method of taking distance from college as an instrumental variable ever made it past the drawing board. (People move for non-random reasons!)

[[2]](#ftnt_ref2) The Journal of Economic Perspectives is a special journal, which commissions pieces to reflect the consensus on new advances in the field.

[[3]](#ftnt_ref3) There would later be some controversy over whether the effects were accurately measured – I do not believe the criticism, however, which, after correcting a few small errors, hinge on treating groups which were in line to be treated, but were not yet treated, as part of the treatment group rather than the control group. This is bizarre to me, as the not-yet-treated groups are otherwise indistinguishable from the control groups. Also, they do not cover externalities argument in any depth. As [Chris Blattman](https://chrisblattman.com/blog/2015/07/23/dear-journalists-and-policymakers-what-you-need-to-know-about-the-worm-wars/) writes, “To be quite frank, you have throw so much crazy sh\*t at Miguel-Kremer to make the result go away that I believe the result even more than when I started.” For more, read “[Worm Wars](https://blogs.worldbank.org/en/impactevaluations/worm-wars-review-reanalysis-miguel-and-kremer-s-deworming-study)” from Berk Oezler, and the synoptic “[Worm Wars: The Anthology](https://blogs.worldbank.org/en/impactevaluations/worm-wars-anthology)”. In general, we need to separate out what we mean by “fails to replicate”, and “is not robust”. Arguing about which statistical practice is best is very different from the data being fake, or the supposed analysis plan not producing the actual results. I agree entirely with [Michael Clemens](https://www.cgdev.org/publication/meaning-failed-replications-review-and-proposal-working-paper-399) here.

[[4]](#ftnt_ref4) As opposed to the actuality of time, which we won’t be getting into today.

[[5]](#ftnt_ref5) And again (and again)

[[6]](#ftnt_ref6) And as a side note, I do find it a bit worrisome how little I hear about nuclear concerns these days.  AI is certainly a more exciting way for a species to commit suicide, but we’ll be approximately as dead either way, and geopolitical tensions seem to be having a moment.  

[[7]](#ftnt_ref7) Just a feeling.  I’m confident that isn’t literally the case, although it would, ironically, make a pretty great story.
