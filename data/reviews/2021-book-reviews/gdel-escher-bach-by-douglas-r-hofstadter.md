---
title: "Gödel, Escher, Bach by Douglas R. Hofstadter"
author: "Unknown"
reviewAuthor: "Anonymous"
contestId: "2021-book-reviews"
contestName: "2021 Book Reviews"
year: 2021
publishedDate: "2026-02-06T07:21:29.570Z"
slug: "gdel-escher-bach-by-douglas-r-hofstadter"
wordCount: 6098
readingTimeMinutes: 28
originalUrl: "https://docs.google.com/document/d/1xexFJ7h0vULMDE7N77q_MIzXoerexfe_CqqGEL6hEoQ"
source: "gdoc"
---

Gödel, Escher, Bach, like this sentence, has two parts: the first cleverly makes its point while engaging the reader with playful use of self-reference; the second is less interesting, slower developing, and far longer ... in fact, it's so long that you're likely to quit reading it before it ever gets to its

Part I is an exposition of many interesting and deeply related ideas: formal systems like math and physics acquire meaning by modeling the world; recursion gives these systems power but also opens the door to self-reference; and self-reference ultimately poses a serious problem for these systems. These ideas build to the statement and proof of Godel’s Incompleteness Theorem.

Part II, roughly speaking, claims that the ideas of part I have something to do with artificial intelligence and the nature of consciousness. This is a review of GEB part I, though I’ll briefly touch on part II at the end.

Before I start, let me tell you some things that won’t be in this review because you really can’t get them from anywhere but GEB itself.

First, GEB author Douglas Hofstadter sees interconnections everywhere. GEB initially comes across as a perplexingly well-regarded conspiracy theory text. But reading on, you come to see the magic: all of the conspiracies are actually true. This is reflected in the title of the book: Hofstadter first set out to write a pamphlet on Gödel’s theorem, but as the pamphlet grew into a book and then a 700-page tome he came to believe that the work of Escher and Bach were too interconnected with the subject matter to be omitted. So if you want to know why Gödel numbering is just like DNA transcription, or recursive transition networks are just like renormalization of elementary particles, sorry. You’ll have to check out GEB from your local library.

Second, this review will feature very few of Hofstadter’s actual words. The reason is simple: there’s way too many of them. In a previous draft of this review, I tried quoting out of GEB for a few simple things, but it would always turn out like “Hofstadter thinks humans are sometimes different than machines: [300 word quote that somehow essentially involves an analogy about how you think your wife wants you to turn off the TV, but she wants you to start a government-overthrowing revolution] (page 37).” Though I personally enjoy the colloquial, meandering feel of Hofstadter’s writing, many find it infuriating, and it’s probably a key reason that the few people who attempt reviews of GEB tend to quote Lewis Carroll as much as Hofstadter himself.

And third, GEB is really idiosyncratic in a way no one can imitate. The book’s chapters are each separated by an entertaining Carrollian dialogue featuring the quick-thinking tortoise and his slower friend Achilles; these dialogues illustrate key ideas that reappear later in the text, imitating the way themes reappear in Bach’s fugues. Hofstadter has an axe to grind with Zen Buddhism, and the first application of a formal logical system he develops in the text is to refute a Zen koan about grinding axes. He also enjoys taking pot shots at composer John Cage for basically no reason.

Overall, I think GEB is a really good book. In fact, I insist that it’s better than you expect [even after taking my insistence into account](https://www.google.com/url?q=https://en.wikipedia.org/wiki/Hofstadter%2527s_law&sa=D&source=editors&ust=1770366086375166&usg=AOvVaw2yM7Fbn3WFnjim5HI97dxg). Rationalist caliph and LessWrong founder Eliezer Yudkowsky, on whom GEB was an early influence, agrees:

"Gödel, Escher, Bach by Douglas R. Hofstadter is the most awesome book that I have ever read. If there is one book that emphasizes the tragedy of Death, it is this book, because it's terrible that so many people have died without reading it."

So, lest you die without familiarizing yourself with GEB, let’s get started.

## I. Formal systems and interpretations

The basic object of study in GEB is what Hofstadter calls a formal system. A formal system consists of:

*   A collection of allowable characters out of which we can form strings (sequences of characters)
*   A collection of strings called "axioms"
*   A collection of rules, or "inference rules," for changing some strings into others

Huh? Let's start with a simple, meaningless example called the MIU-system.

The MIU-system:

*   Allowable characters: M, I, and U. (So strings are things like M, UMM, MIMMIUM, UMIIMUMUUIMIM, etc.)
*   Axioms: MI
*   Rules:

*   Rule I: given a string that ends in an I, you can add a U to the end.

Example: from UMI, form UMIU

*   Rule II: given a string of the form Mx where x consists of M’s, I’s, and U’s, you can form the string Mxx

Example: from MIU, form MIUIU

*   Rule III: given any string with III appearing somewhere inside, you may replace III with U

Example: from MIIII, you can form MUI (by replacing the middle III with U). You can also form MIU (by replacing the ending III with U).

*   Rule IV: given any string with UU appearing inside, you may delete UU

Example: from MUUI, form MI

Let's call a string a theorem if you can produce it from the axiom MI using the inference rules. For example, I claim that MUIIU is a theorem; in support of this I offer the following "proof":

(1) MI           (axiom)

(2) MII         (using rule II)

(3) MIIII           (using rule II)

(4) MIIIIU          (using rule I)

(5) MUIU        (using rule III)

(6) MUIUUIU         (using rule II)

(7) MUIIU           (using rule IV)

There you have it – MUIIU is a theorem (as are all of the strings obtained along the way).

Hold up, axioms? theorems? Readers who've seen some mathematical logic might know where I'm going with this.

The terminology is chosen to suggest the following. We imagine that the given rules are "rules of logical inference," analogous to rules in classical logic like "if you know ‘P’ and you know 'if P then Q,' then you may conclude ‘Q.’" We imagine that the strings of our system are logical statements written in some formal language. And we imagine that the axioms are some logical statements that we declare to be true. So the "proof" above is akin to starting from a known axiom and using the rules of logical inference to deduce some desired theorem, sorta like a proof! Formal systems are a way of mechanistically codifying logic; even a beginning programmer could write a program that starts from the axioms and generates a list of theorems by applying the rules. In fact, this is the basic principle behind how automated theorem-provers like Coq work.

After introducing the MIU-system, Hofstadter offers the following puzzle, which I pass on to you: is MU a theorem? Try to figure it out yourself if you'd like, or read on to find the answer later.

In this example, the MIU-system doesn't seem to reflect the structure of anything we would care about. In contrast, the next example-and-half do: they are meant to model multiplication of natural numbers.

The tq-system:

*   Allowable characters: t, q, \-
*   Axiom: \-t-q-
*   Rules:

*   Rule I: given a string xtyqz where x,y,z are strings consisting of only hyphens, you can form x\-tyqzy
*   Rule II: given a string xtyqz where x,y,z are strings consisting of only hyphens, you can form xty\-qzx

Unlike the MIU-system, the tq-system comes with an interpretation which converts strings of the formal system into meaningful statements in some context. In this case, the context is “multiplications,” and the interpretation looks like

t ⇒ times

q ⇒ equals

- ⇒ one

-- ⇒ two

and so on. This interpretation turns the axiom \-t-q- of the tq-system into the multiplication “one times one equals one” and the theorem \--t---q------ (proved below) into the multiplication "two times three equals six.”

Proof:

(1) \-t-q-                     (axiom)

(2) \--t-q--             (rule I)

(3) \--t--q----             (rule II)

(4) \--t---q------   (rule II)

We can think of an interpretation as giving meaning to a formal system. Uninterpreted, \--t---q------ is a meaningless string of characters, same as the strings of the MU-system. But equipped with the interpretation above, this string comes to mean the multiplication “two times three equals six.” An analogy: to a child ignorant of the world, a globe is just a meaningless spinning toy. But once the child learns that pictures on the globe (the formal system) represent (interpret to) masses of land on the actual Earth (the context), aspects of the globe start to carry meaning – the fact that the splotch of green labeled “Asia” is larger than the one labeled “Australia” corresponds to the continent Asia having a larger land-mass than the continent Australia.

Liberation, by M.C. Escher. Strings in formal systems (the triangles at the bottom) are transformed into meaningful statements (the birds) via interpretation.

At this point, three caveats are in order.

First, you should not think that a formal system necessarily has only one interpretation. For example, here’s another interpretation of the tq-system, now into the context of divisions:

t ⇒ equals

q ⇒ divided into

- ⇒ one

-- ⇒ two

and so on, so that \--t---q------ now interprets to “two equals three divided into six.” In a case like this, it’d be a mistake to argue about what the “true meaning” of the string \--t---q------ is; the correct takeaway is that both meanings are encoded simultaneously. Even this simple example of a double-entendre is somewhat interesting: it demonstrates that the structure of multiplications is “the same” as the structure of divisions (borrowing a word from mathematics, Hofstadter would say that multiplications and divisions are “isomorphic”).

The cover art is a real photograph of two carved blocks of wood. Depending on which interpretation (angle of the light) you use, you can pull three different meanings out of each block.

Second, not all strings of the tq-system come out meaningful under interpretation. The tq-system also contains strings like ttq-t which don’t correspond to any multiplication. Let’s call a string well-formed if it does carry meaning under our choice of interpretation. This includes strings like \-t-q-- which do mean something (one times one equals two) even though that something is false.

And third, all of the theorems of the tq-system are not only well-formed, but they also represent true multiplications. For example the theorems \-t-q- and \--t---q------ interpret to the true multiplications "one times one equals one" and "two times three equals six." (The well-formed string \-t-q-- doesn’t, but that’s fine because it’s not a theorem.) This is really important, so let’s make it a requirement: if I call something an “interpretation” of a formal system, I will always mean that the theorems are well-formed and come out true under the interpretation.

For a counterexample, if we changed ‘\-’ to mean “two,” then we wouldn’t have an interpretation anymore since the theorem \-t-q- would represent the multiplication "two times two equals two," which isn't two – achem excuse me – true.

As a final half-example of a formal system, let's augment the tq-system so it can prove theorems representing statements like "6 is composite."

The tqCP-system:

- Allowable characters: t,q,\-,C,P

- Axioms: same as tq-system

- Rules: same as the tq-system, plus

    Rule III: given a string xtyqz where x,y,z consist of at least two hyphens, you can form Cz

The interpretation I intend for the tqCP-system into the context of “arithmetical statements” looks the same as the tq-system, plus:

Cx ⇒ x is composite

Px ⇒ x is not composite (or equivalently, x is prime)

What’s up with having a P when the inference rules don’t allow it to appear in theorems? More on that later.

## II. Jumping out of the system

I claimed above that the given interpretation of the tq-system was valid, i.e. that it transforms theorems of the system into true multiplications. How do I know that? Sure I gave two examples, the theorems \-t-q- and \--t---q------, but how can I be sure that every one of the infinitely many theorems of the tq-system interpret to true multiplications?

I’ll argue like this. First of all, the axiom \-t-q- interprets to a true multiplication (one times one equals one). Second, we note that given a string xtyqz which represents a true multiplication (x times y equals z), rule I produces a string which represents a true multiplication ((x plus 1) times y equals z plus y). Same goes for rule II. As our axioms are true and our rules of inference preserve truth, all of our theorems must be true as well!

Where did the reasoning in the last paragraph take place? It certainly wasn't a proof "inside the tq-system," since those proofs just look like lists of tq-strings which obey the inference rules. Rather, it was an example of "stepping outside of the system." We reasoned about the tq-system using ordinary reasoning, not the internal formal logic of the tq-system. After all, the system knows nothing about the interpretation we've given it – it doesn't know that its theorems are supposed to represent multiplications. So we can't possibly hope to prove the validity of the interpretation by working within the tq-system. We had to step outside.

Here's another example of stepping outside the system. We just saw that every theorem of the tq-system represents a true multiplication. In fact, the converse is also true, namely that every true multiplication is represented by a theorem of the tq-system! If you're interested, you may wish to prove this – it will require stepping outside the system. Then, using this observation, you can derive theorems of the tq-system "from the outside." For example, since \---t---q--------- represents a true multiplication, we know that it must be a tq-theorem. Again, this isn't a "proof" in the formal sense, because a proof is a sequence of tq-strings produced by applying rules. It is a proof from the outside.

Hofstadter points out that jumping outside the system is an important feature of intelligence. Before I introduced the tq-system I told you what my intended interpretation was. But even had I not, it's very likely you would have discovered it after a few minutes writing down tq-theorems. Instead of mindlessly churning out an ever longer list of theorems, you would instead gradually notice the patterns, put down your pencil to think, and discover that you can predict what all the tq-theorems are without writing them down. These are all outside-the-system activities.

Even now, you’re likely making frequent jumps out of your “reading this book review” system. Perhaps you’re pausing to check if you’re thirsty or need to go to the bathroom. And perhaps now you’re asking yourself if it counts as jumping out of the system if I just told you to do it. And maybe you’re now trying to do something I didn’t tell you to do just to prove that you really can jump out of the system. (sorry)

Contrast this with the behavior of a graphing calculator running a basic program that prints out a list of tq\-theorems. The graphing calculator will never stop executing its code, step back to survey the data, notice the pattern, and print out IT'S THE MULTIPLICATIONS YOU DUMMY. Of course a human is ultimately some program, albeit a very complicated one running on the most powerful computer in the known universe. Accordingly, there is some system out of which we are unable to step, the same way biological evolution is unable to step back, take a look at the data, and shout into the void [JUST KEEP MAKING MORE CRABS](https://www.google.com/url?q=https://xkcd.com/2314/&sa=D&source=editors&ust=1770366086394040&usg=AOvVaw28gzB1m71-DF0N4-oOMrol) YOU DUMMY. The point isn't that human intelligence is "special" in some way that purely mechanistic reasoning can never replicate. The point is simpler: intelligent systems seem to be able to identify and run subtasks, as well as to monitor these subtasks from the outside and determine when to stop doing them.

## III. Truth vs. provability

“ ‘Snow is white’ is true if and only if snow is white.”

– Alfred Tarski

At this point, it’s possible you’re mixing up the notions of truth and provability. If so, don't feel bad: so did literally everyone for the whole history of logic until 1930. That's when German logician Kurt Gödel announced his namesake Incompleteness Theorem, a consequence of which is that truth and provability really must be considered as separate notions. A goal of GEB part I, and of this book review, is to outline the key ideas going into this theorem. In this section I'll explain the distinction between truth and provability and state Gödel's theorem. But first, a story about Gödel.

Life in late 1930s Europe wasn't treating Gödel well. For one, he was unable to find a position because he had too many Jewish friends (a common side-effect of being a mathematician). And to make matters worse he had been conscripted to the German army. So Gödel did the logical thing: he fled to the U.S., got a position at Princeton, and hung out with his buddy Albert Einstein (who confessed that the only reason he showed up to work was for "the privilege of walking home with Gödel.") While studying for his U.S. citizenship exam, Gödel claimed to have discovered this one weird trick for legally turning the U.S. into a dictatorship (anti-fascists hate him!) Despite Einstein's warnings to Definitely Not Bring That Up, Gödel totally Brought It Up during his citizenship interview. Fortunately, Einstein, who was there serving as a witness and also knew the interviewer, managed to smooth everything over. Gödel became a citizen. I'm not sure what the moral is, but hopefully this gives you a taste of the mind of Kurt Gödel.

Okay, back to the logic textbook masquerading as a book review. A good way of thinking about the truth/provability distinction is that provability comes from the formal system and truth comes from the interpretation+context.

Provability is simpler, so let's tackle it first. Calling a string in a formal system provable is just a fancy way of calling it a theorem. That is, “provable string” and “theorem” are synonyms. This should make sense: remember that "theorem" just means something you can deduce from the axioms using the inference rules, i.e. something you can "prove."  For example, the strings \-t-q- and C------ are provable in the tqCP-system, but \-t-q-- is not. In the MIU-system, MI and MUIIU are provable but (spoiler!) MU is not. Note that provability is a purely formal notion, i.e. it depends only on the formal system and not on whatever interpretation you attach to it.

Truth on the other hand relies on a choice of interpretation. Given a formal system with an interpretation, we say that a string of the system is true if it comes out true under the given interpretation. For example, \--t---q------ is true because two times three does equal six, but P---- is false because four isn’t prime. We can't say whether MIII or MMU are true because we don't have an interpretation for the MU-system in mind.

Since by fiat all of our interpretations translate theorems to true statements, we know:

in a formal system with an interpretation, all provable strings of the system are also true.

Or more succinctly: if provable then true. This is really important: it's why mathematicians and physicists can write some funny little squiggles on paper, do logic on them, produce some different funny squiggles, and be confident that the new squiggles actually mean something true about the universe!

You might be tempted to believe the converse: that every true statement in a formal system is also provable. (Or at least, you might have been tempted to think that if I didn't have a whole section titled "truth vs. provability".) But consider the string P-- of the tqCP-system, which interprets to "two is prime." This string is certainly true, since two is prime. But it is not provable in the tqCP-system – in fact, none of the rules of the system allow you to produce a theorem with the character P.

You're probably thinking that this demonstrates that the tqCP-system is bad in some way, or at least woefully incomplete. Perhaps you're tempted to augment the tqCP-system by adding a new rule: if Cx is not a theorem for some x consisting of only hyphens, then Px is a theorem. But there's an issue here: applying this rule requires making a list of all (infinitely many) theorems of the tqCP-system and checking that Cx is not among them. But this is not the sort of simple, mechanistic rule that our formal systems are allowed to have – no person, and certainly no computer, could ever finish writing down all the theorems and checking that C-- is not among them. You might be able to prove from outside the system that C-- is not a theorem, but such "outside the system" reasoning has no bearing on provability inside the system.

Fear not: Hofstadter does explain a way of augmenting the tqCP-system to be able to prove statements like P-- (though it requires adding new characters as well as new rules). So now can we admit that the tqCP-system is no-good, and that we should root out all formal systems that can’t prove all their truths and replace them with ones that can?

If only! Gödel doesn't tolerate citizenship interviewers ignorant about weird tricks for making dictatorships, and he won't tolerate our nonsense either. Here is his theorem.

Gödel's Incompleteness Theorem: any sufficiently rich formal system (with an interpretation) has strings which are true but unprovable.

A formal system which is able to prove all of its truths is called "complete." So Gödel's theorem says that every sufficiently rich formal system is incomplete – there will always be unprovable truths.

## V. Self-reference and the proof of Gödel's theorem

Suppose that Donald Trump were to walk into your room and say:

"This sentence is a lie."

It being Donald Trump, you might suspect that he's lying. But if that were the case, then "This sentence is a lie" would be the truth, so Donald would be telling the truth ... a contradiction! Likewise, if you give him the benefit of the doubt and suppose he's telling the truth, you'll come to find that he's lying, another contradiction (and another Tuesday in politics).

This is called the liar's paradox, and it’s the basic idea behind the proof of Gödel's theorem. The core of the issue is that we have a system (the English language) trying to model itself, and we’ve exhibited a sentence whose interpreted meaning references that very same sentence. This snake-eating-its-own-tail pathology can be arranged to create other [similar paradoxes](https://www.google.com/url?q=https://en.wikipedia.org/wiki/Grelling%25E2%2580%2593Nelson_paradox&sa=D&source=editors&ust=1770366086403189&usg=AOvVaw32FOSm0GO7JqEdVNK45MMQ).

You might think that we can fix things like this with a simple rule like “no interpretation of a formal system can have the context be that very same system.” Unfortunately, things aren't so easy. Consider the following two-step version of the liar's paradox.

The German sentence below is false.

Der obige englische Satz ist wahr. ("The English sentence above is true.")

Here, "sentences in English" has an interpretation with context "sentences in German." But "sentences in German" itself can model "sentences in English." And although each sentence by itself is perfectly harmless, the whole is paradoxical!

Drawing Hands, by M.C. Escher, an illustration of the two-step liar’s paradox.

Part of the issue is that English is too rich. That is, it's able to talk about concepts like "truth" and "falseness" as well as support self-reference. It’s also rich enough to model systems (like German) which are themselves rich enough to model English, enabling the two-step liar’s paradox. These aren't issues that are easy to patch; it's not clear how much of English we would need to remove to make it "not too expressive." Perhaps in doing so, we would destroy our ability to say anything useful.

English is too fuzzy to work with, so instead Gödel works with statements of number theory – things like "two plus two equals four" and "four is a factor of eight." It ends up that while number theory isn’t expressive enough to talk about the truth of number-theoretical statements, it is expressive enough to talk about the provability of number-theoretical statements.

The idea of Gödel's proof is to encode a “provability version” of the liar's paradox into number theory. That is, given a formal system rich enough to model number theory, Gödel comes up with a string G of the system whose meaning under interpretation is:

“G is not provable.”

If G were false, then G would be provable and hence true, a contradiction. So G must be true, making it an unprovable truth. It follows that the formal system in question is incomplete.

The rest of this section fleshes out this idea in more detail, using an idea called Gödel numbering. I think it’s pretty cool, but if it’s not your cup of tea, feel free to skip to part VI.

As a warm up, recall the MU puzzle from above: determine whether MU is a theorem of the MIU-system. I will now demonstrate that the answer is "no – MU is not a theorem." The idea is to encode "MU is a theorem of the MIU-system" as a claim about number theory, and then figure out if that claim about number theory is true.

To do this, let's first transform strings of the MIU-system into numbers by the rule:

M ⇒ 3

I ⇒ 1

U ⇒ 0

For example, MIUUI is the number 31001, MU is the number 30, and the axiom MI is the number 31. Under this transformation, the rules of the MU-system can be stated arithmetically. For example, rule I says that if a number has units digit 1, then you may multiply it by 10 (thereby appending a 0 to the end). Or more formally:

given a number of the form 10m + 1, you may form the number 10\*(10m + 1).

You can do the same thing for the other rules too.

Let's call a number which corresponds to a theorem of the MIU-system a MIU-number. So we've transformed the claim "MU is a theorem of the MIU-system" to the equivalent claim "30 is a MIU-number," which can also be stated as “30 can be formed from 31 by repeatedly applying such-and-such arithmetical operations.” This might not seem like progress, but it is! The claim "30 is a MIU-number" is a number theoretical statement (though perhaps not an interesting one). In essence, it’s similar to – but more complicated than – the more familiar statement “216 is a power of 6” i.e. “216 can be formed from 1 by repeatedly applying the multiply-by-6 operation.”

Now we can dispose of the MU puzzle by proving a proposition about MIU-numbers:

No MIU-number is divisible by 3.

I’ll leave the proof to you – it’s not hard, especially if you remember [the rule](https://www.google.com/url?q=https://en.wikipedia.org/wiki/Divisibility_rule%23Divisibility_by_3_or_9&sa=D&source=editors&ust=1770366086408757&usg=AOvVaw3OYjA8jR6k5eCj5FOb1mOV) for checking whether a number is divisible by 3.

Since MU corresponds to 30, which is divisible by 3, we deduce that 30 is not a MIU-number. Hence MU is not a theorem of the MIU-system, and we’re done. If you're rightly baffled, you can press pause on your computer screen now to reflect deeply on what’s happened. You can press play when you're ready to resume the proof of Gödel's theorem.

The procedure above turned strings of the MIU-system into numbers, and claims about those strings into statements of number theory. This is called Gödel numbering, and it can be done to any formal system. Via Gödel numbering, the claim "MU is a theorem" about the MIU-system corresponds to the number-theoretical claim "30 is a MIU-number.” In other words, despite the MIU-system having no interpretation that gives its strings meaning, Gödel numbering gives number-theoretical meaning to certain claims about the MIU-system.

Could something interesting happen if we Gödel number a system that already has an interpretation into number theory? Could the meaning acquired through the interpretation clash with the meaning induced by Gödel numbering? Could my rhetorical questions get any more leading? Is the answer to all of these yes?

In GEB, Hofstadter spends two chapters constructing an explicit example of a formal system that models number theory, called Typographical Number Theory, or TNT (foreshadowing that it will blow itself up). For the sake of concreteness, he then proves the Incompleteness Theorem for the system TNT. Nevertheless, the same proof works for a general formal system S with an interpretation into number theory, and I’ll explain it here in this more general language.

(here comes the technical meat; please set your brains to “think very hard”)

Suppose we are given a formal system S with an interpretation into number theory. And suppose that the formal system is "rich enough" in the sense that any statement about number theory can be rendered as a string of S. We want to show that S has an unprovable truth. Fix a Gödel numbering for S, i.e. a correspondence between characters of S and digits which turns all the strings of S into numbers and all the rules of S into arithmetical rules. As before, let's call a number an S\-number if it corresponds to a theorem of S.

Given a string G of the system S, let g be the number corresponding to G under the Gödel numbering. Now, "G is not a theorem of S" is equivalent to the number-theoretical claim "g is not an S\-number.” But the number theoretical claim "g is not an S\-number" can in turn be rendered as a string of S (as can any number theoretical claim, by assumption). Let's call this string G'.

In a situation like this, Gödel gave a magic recipe (or see chapters 13 and 14 of GEB) for cooking up a specific string G such that the resulting G' is the same as G. Thus, this G interprets to the statement “g is not an S\-number,” which is true if and only if G is not a theorem of S. Informally, we might say that G carries the meaning “G is not provable in S.” And now we’re done: if G is false, then G is a theorem of S, and is therefore true, a contradiction. So G is true, and thus G is not provable. Thus G is an unprovable truth and S is incomplete. Q.E.D.

I'll end this section with an exercise for those interested: how is this proof like the proof of undecidability of the halting problem? (For solutions, please consult Gödel, Escher, Bach by Douglas Hofstadter.)

## VI. GEB Part II

As a math grad student, I’m not a bad person to write a book review of GEB part I. On the other hand, I’m vastly unqualified to say anything about GEB part II. Buuuut I’ll say a bit anyway.

My executive summary of GEB part II is: you know all those crazy ideas about self-reference, meaning, etc. in part I? Those all have something to do with intelligence and consciousness.

Obviously this summary isn't doing it justice. There's a bunch of big ideas in it, a slew of interesting paradigms, and my overall sense is that most of them are wrong.

Why so? Part of it is that Hofstadter argues from first principles for a bunch of claims that don’t seem to have aged well since GEB’s 1979 publication. For example:

1.  While he avoids positing the existence of a so-called "grandmother neuron" – that is, a neuron whose sole job is to fire whenever you need to make use of the concept "grandmother" – he does seem to think that something kinda like this is true: that there is a "grandmother module" in the brain – perhaps a collection of neurons – which activates whenever you think of a grandmother.
2.  He seems to believe that the way we think thoughts is for all of our various modules to fire together in roughly the same way that a bunch of words are said together to form a sentence. E.g. the thought "My grandmother is happy" boils down to the modules in your brain representing "grandmother" and "happy" firing together, along with some additional information to specify that it is “my grandmother” instead of just “a grandmother” and things like that.
3.  His paradigm of (artificial) intelligence seems to involve intelligent systems working symbolically within a formal system while simultaneously connecting the patterns of the formal system to whatever problems it’s trying to solve.

Idea 1 … well it’s actually not so bad. We have a decent understanding of how the brain does the most basic steps of visual processing – things like edge detection – and we’ve identified some particular neurons that fire together in certain ways to encode information about the orientations of lines. This is kinda like a low-level version of grandmother module for very simple concepts like vertical-ness (though apparently [predictive processing](https://www.google.com/url?q=https://slatestarcodex.com/2017/09/05/book-review-surfing-uncertainty/&sa=D&source=editors&ust=1770366086416452&usg=AOvVaw09wIu3YpgRJpglrpNkC2NF) has another take on what information exactly is being represented). Also, some people with brain damage have [trouble distinguishing](https://www.google.com/url?q=http://klab.tch.harvard.edu/academia/classes/Neuro230/2012/HMS230_Reading_Assignment_3.pdf&sa=D&source=editors&ust=1770366086416696&usg=AOvVaw1UrQOUP6-hBag14Kq0H-8E) among inanimate objects but not among animate ones, which if you squint kinda looks like evidence we have an “inanimate object” module in our brain which sometimes gets damaged.

On the other hand, my girlfriend studies the brain of C. elegans, a nematode with 302 neurons (the human brain has around 86 billion neurons). She specifically studies olfaction – how the worm processes smells. You would think if there were a small module representing the concept of sulfuric-odor-ness or whatever, we would have found it by now. Instead, it doesn’t really look like the information of the smell is stored in any one place. Her advisor – a fancy professor who knows a whole lot about the C. elegans brain – thinks that the whole brain is involved even in simple things like detecting a smell. And my sense of the more complicated field of human neuroscience is that it’s not so keen on the “such-and-such part of the brain represents such-and-such concept” paradigm either.

Given these issues with idea 1, idea 2 looks only more ludicrous. I’m not even sure what to say here other than to gesture generally at everything I know about the brain (warning: not much) and note that none of it looks at all like this paradigm.

Maybe idea 3 – building an AI that constructs formal systems to model the world, and then works within these formal systems to generate new data/predictions/whatever – could work. But it seems so, so far from the direction that AI has actually gone. I don’t see how this paradigm could survive a collision with GPT-3, which can write ([and draw](https://www.google.com/url?q=https://openai.com/blog/dall-e/&sa=D&source=editors&ust=1770366086418472&usg=AOvVaw3f5bfkAYfib4eR6jb5DN6a)) better than most people I know, but fails at multiplying large numbers. If GPT-3 secretly works by constructing a super complex formal system that models the human-produced text in its training data, how come it couldn’t come up with a much simpler formal system (like the tq\-system) for modeling the multiplications?

Actually, why am I even talking about GPT-3? Are we really supposed to believe that the human brain is able to model all the complexities of language, society, whatever by computing really rapidly in hyper-complex formal systems ... yet I can’t consistently subtract 6 from 11? Whatever my brain is doing to model the world, constructing and working in formal systems doesn’t seem like one of its natural hardware capabilities.

In fact, this is exactly what has given us our edge over computers until now! Any useful formal system is necessarily very complicated and unwieldy. Hofstadter spends two chapters constructing a formal system for modeling number theory, and as a challenge asks the reader to write down the statement “x is a power of 10” as a string of the formal system. [Here’s](https://www.google.com/url?q=https://math.stackexchange.com/questions/893526/how-to-express-b-is-a-power-of-10-typographical-number-theory-in-g%25C3%25B6del-esche&sa=D&source=editors&ust=1770366086419818&usg=AOvVaw2hzVRgCt5jgl944WX3kOCE) the answer; scroll down to where it says “all together.” Humans have been able to outthink computers so far by implementing high-level heuristics instead of working with formal systems directly. And to the extent that computers are catching up, it seems like they’re doing it by coming up with even better high-level heuristics, not by throwing more resources at more efficient formal systems. (Unrelated: upon reading an article saying that AI would put mathematicians out of business in 10 years, my advisor remarked: “That’s just enough time for you to get tenure!”)

For now, it tentatively seems to me that Hofstadter is playing the “[Gödel’s theorem and consciousness are both mysterious and therefore equivalent](https://www.google.com/url?q=https://www.smbc-comics.com/comic/the-talk-3&sa=D&source=editors&ust=1770366086420663&usg=AOvVaw3UEuoABtgYuCb9nYhtc705)” game. If there's some way to salvage Hofstadter's ideas in part II, someone other than me will have to write the book review doing it.

Relativity, by M.C. Escher. Like GEB, this drawing makes more sense if you only look at half of it.

* * *