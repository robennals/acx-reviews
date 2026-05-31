---
title: Prior Analytics
author: Unknown
reviewAuthor: Anonymous
contestId: 2026-book-reviews
contestName: 2026 Book Reviews
year: 2026
publishedDate: '2026-05-19T21:00:39.000Z'
slug: prior-analytics
wordCount: 8165
readingTimeMinutes: 37
source: gdoc
tags:
  - Philosophy
---

In _Prior Analytics_, Aristotle gives his account of formal logic. Aristotle’s logic is purely a predicate logic, and never treats statements as logical units. The abandonment of Aristotelian logic might lead one to believe that Aristotle’s logic is merely an out-dated predecessor, but it is worth examining it to see if this is really the case. (I am relying on the translation of _Prior Analytics_ by A. J. Jenkinson from _The Complete Works of Aristotle: The Revised Oxford Translation_.)

## Definitions

Aristotle defines (1.1) a _deduction_ (sometimes translated as _syllogism_) as a series of statements such that something other than what was stated follows by necessity from what was stated. A _perfect deduction_ is one ‘that needs nothing other than what has been stated to make the necessity evident’, while an _imperfect deduction_ is a deduction such that something other than the statements, but which is implied by them, is needed.

A _statement_ (or _proposition_ – due to the technical use of _proposition_ in contemporary philosophy, I will stick to the word _statement_) is a sentence that affirms or denies one thing of another. And a _term_ is that which is being affirmed or denied of something, or that to which something is being affirmed or denied. The statement can either affirm or deny in whole or in part or indefinitely; and it either affirms or denies simply, necessarily, or contingently (I will only cover the first case here, otherwise this review would be much longer).

So, the statements in Aristotle’s (non-modal) logic are of the form _A belongs to all B_ (universal affirmative), _A belongs to some B_ (particular affirmative), _A belongs to B_ (indefinite affirmative), _A belongs to no B_ (universal negative), _A does not belong to some B_ (particular negative), or _A does not belong to B_ (indefinite negative).

Finally, Aristotle describes what it is for one term to ‘be in another as in a whole’ and what it is for one term to be ‘predicated of all of another’:

> That one term should be in another as in a whole is the same as for the other to be predicated of all of the first. And we say that one term is predicated of all of another, whenever nothing can be found of which the other term cannot be asserted; ‘to be predicated of none’ must be understood in the same way.

There are several concerns one might have so far. One is whether Aristotle’s account of a _statement_ is broad enough to allow one to state everything that one might want to state.

Certainly it is important that relations can be stated, and any facts that cannot be expressed by a simple predicate. However, Aristotle allows that terms can be relative and need not be expressed by a single word. So, for example, you could say _Adults are stronger than children_, where _stronger than children_ and _adult_ are the terms.

One thing that Aristotle’s logic does not allow, however, is conditional statements. This will be discussed later, as will disjunctions.

Another concern is whether Aristotle’s account of a valid deduction is precise enough. What he says is:

> A deduction is a discourse in which, certain things being stated, something other than what is stated follows of necessity from their being so. I mean by the last phrase that it follows because of them, and by this, that no further term is required from without in order to make the consequence necessary.

A valid deductive argument in modern logic is often defined as one in which the material conditional with the conjunction of the premises as the antecedent and the conclusion as consequent is a tautology (no matter what truth-values are assigned to the statements, the conditional is true).

Besides the fact that Aristotle had no concept of a material conditional, this definition does not align with what Aristotle says. First, it allows for trivially question-begging arguments, for example _P, therefore P_, but Aristotle says that a deduction must result in a conclusion other than what has been stated.

The definition also leads to the principle of explosion, where any conclusion follows from a formal contradiction, since the antecedent of the conditional is false as a matter of logical necessity, and so the conditional is true as a matter of logical necessity (since a material conditional is defined such that the conditional is false if and only if the antecedent is true and the consequent false, but since the antecedent has a formal contradiction it will be false no matter what truth values are assigned to the statements). Aristotle rejects the principle of explosion, although he accepts the law of non-contradiction, so he would say that all such arguments are unsound, but some are valid (see 2.15, where Aristotle discusses when it is possible to draw a conclusion with ‘opposed’ premises).

The definition also entails that if the conclusion is a tautology, then no matter what the premises are, the argument is valid.

An alternative definition for a valid deductive argument is that there is no possible world where the premises are true and the conclusion is false. This leads to similar results as above, but if possibility is now understood as metaphysical possibility, any argument with a metaphysically necessary truth as the conclusion would be considered valid (since there is no possible world where the conclusion is false), as well as any with premises that are individually or together metaphysically impossible (since there is no possible world where the premises are true). It is plausible to interpret all statements in Aristotelian logic as necessary truths, in which case any true statement preceded by any statements whatsoever would count as a valid deduction, and any one with false premises, even if the conclusion is also false, would be a valid argument.

So these definitions of logical validity are not in alignment with what Aristotle says; and in any case, it seems reasonable to reject them. It still remains to consider whether what Aristotle says is adequate.

He says that the conclusion ‘follows of necessity’ from the truth of the premises. He further says ‘it follows because of them’. Now, it seems that there are two ways we might interpret him, one that is metaphysical, and the other epistemic.

Under the metaphysical interpretation, he is saying that the statements express some metaphysically explanatory relationship. We could say that all snow is colored because it is white, and white is a color; the presence of the first term (_colored_) in the last term (_snow_) is caused by the presence of the middle term (_white_). Now, it is clear from statements Aristotle makes in the _Posterior Analytics_ that he does think that some deductions meet this criterion. However, Aristotle also makes a distinction between _demonstration_ and _deduction_ more broadly (_Prior Analytics_, 1.4); demonstration requires understanding, and for there to be understanding, one must be aware what the explanation is (_Posterior Analytics_, 1.2).

If one distinction between demonstrative and non-demonstrative deductions is that the former must involve an explanatory relation, and the latter need not, then it is clear that expressing such a relation cannot be a condition of logical validity. If we accepted this as a condition of validity, we must reject arguments of the sort _White belongs to all snow, but not to some humans, so snow does not belong to some human_: no human fails to be snow on account of failing to be white. In general, presumably no term fails to belong to another on account of the latter’s contingently failing to have some attribute that belongs to the former. The following might also need to be rejected: All triangles are rectilinear figures whose interior angles equal two right angles, no square is a rectilinear figure whose interior angles equal two right angles, therefore no triangle is a square. If the reason that no triangle is a square is instead that no three-sided figure is a four-sided figure, then we would need to reject the previous deduction. But presumably we should allow for such deductions to be valid.

If we reject the metaphysical interpretation on the grounds that it would rule out deductions that clearly do lead to a conclusion but which do not express an explanatory relation, then we are left with the epistemic interpretation. Under this interpretation, we must say that given that certain things are stated as true, one would be rationally compelled to accept the conclusion, on account of those statements. Of course, we should also say that there is no possible world where the premises are true and the conclusion is false – this would be a necessary but not sufficient condition for deduction.

To accept this definition, one must accept that there are epistemic normative facts. But so long as one accepts that, I cannot imagine that there is any objection to the definition’s coherence, or any counter-examples. However, this is not a formal definition that allows one to verify the validity of arguments. Instead, one must ultimately use intuition (intellectual appearances) to determine whether certain kinds of arguments are valid, by considering whether the premises are sufficient to cause a rational agent to accept the conclusion. It is plausible that there is no definition that both allows us to determine validity and which avoids the sort of undesirable consequences the other definitions considered have.

One last topic needs to be discussed here. As said above, Aristotle distinguishes between universal, particular, and indefinite statements. He makes comments throughout about the validity of syllogisms involving indefinite statements, but I will ignore this. In fact, indefinite statements have exactly the same meaning as particular statements. Indefinite statements are ambiguous between universal and particular statements; but particular statements are themselves ambiguous in the sense that when one says that _A belongs to some B_, it might well be the case that A belongs to all B. To deny this would cause serious problems for Aristotle’s logic, since conversions (see the next section) rely on this fact (it cannot be ensured that B belongs only to some and not all A given that A belongs to all B). So particular and indefinite statements are logically equivalent, and so the deductions for indefinite statements will be exactly the same as for particular statements.

## Conversion

Before considering the valid syllogisms, we must consider ‘conversion’, which is used to justify the validity of some of the syllogisms. In the case of some statements, Aristotle maintains that the terms are ‘convertible’ in the sense that a statement about A’s relationship to B entails a statement about B’s relationship to A.

Specifically, if A belongs to no B, then it must be that B belongs to no A; if A belongs to all B, B must belong to some A; and if A belongs to some B, then B must belong to some A. He gives example terms in all these cases: if no pleasure is good, it must be that no good is pleasure; if all pleasure is good, then some good is pleasure; and lastly if some pleasure is good, then some good is pleasure. But there is no conversion in the case where A does not belong to some B, since it might be the case that B belongs to all A; he gives the example that some animals are not men, but all men are animals.

Aristotle gives justifications for the conversions (1.2):

> First then take a universal negative with the terms A and B. Now if A belongs to no B, B will not belong to any A; for if it does belong to some B (say to C), it will not be true that A belongs to no B–for C is one of the Bs. And if A belongs to every B, then B will belong to some A; for if it belongs to none, then A will belong to no B–but it was laid down that it belongs to every B. Similarly if the proposition is particular: if A belongs to some B, it is necessary for B to belong to some A; for if it belongs to none, A will belong to no B.

It might be thought that this is flawed. He says ‘for if it does belong to some B (say to C), it will not be true that A belongs to no B’. But the statement that needs to be supposed for a _reductio_ is _B belongs to some A_, not _A belongs to some B_, since this is the contradictory of _B belongs to no A_. It might be thought that he is assuming that A and B are convertible in particular affirmative statements, but he then justifies the conversion of those statements by the conversion of the universal negative, which would be circular.

However, he says ‘say to C’, so presumably he was relying on exposition. So we could imagine taking C, an instance of A that B belongs to (since by the supposition, B belongs to some A), and since it is an A, A belongs to it, and B belongs to it, so that it is a B that A belongs to (that is, A belongs to some B); but this contradicts the assumption that A belongs to no B, so it must be that B belongs to no A (this is the contradictory of B belongs to some A). And then there is no circularity (although he could have used this method for the other cases as well).

Aristotle does not take these conversions to be deductions, but one might question whether this is correct. One might think that _A belongs to no B, therefore B belongs to no A_ is a valid deduction, since it seems that the positing of the first statement rationally compels one to accept the second, and these are two different statements.

To deny this, perhaps it can be said that in such a case one is not really accepting something other than what was stated, which was a criterion of valid deduction.

Now, it must be the case that a statement, being a truth-apt sentence, corresponds to some abstract state of affairs. There is no mind-independent distinction between the state of affairs that no man is a rock and the state of affairs that no rock is a man; this is especially clear if we take such statements to be equivalent to something like _man and rock are incompatible_ – obviously it would make no difference if we said _rock and man are incompatible_. So if a necessary condition of deduction is that one is rationally compelled to believe the truth of some state of affairs that differs from what was expressed by the premises, then this would not be a deduction.

Similar things can be said about the other conversions as was said about the negative universal.

In the case of the particular affirmative, the statements clearly express the same thing; it makes no difference to the meaning whether we say _white is compatible with animal_ or _animal is compatible with white_. The fact is the same in both cases.

Finally, there is the case of the universal affirmative. The compatibility of terms (that is, where two terms can co-exist in the same subject) allows for different relations between the two terms (or rather, what the terms represent). It could be that A and B are merely compatible (like _triangle_ and _white_ are compatible; it is possible for the two predicates to co-exist in some substance, but not guaranteed), or A is merely a consequent of B (like _animal_ is a consequent of _man_; _animal_ is guaranteed by _man_), or A is merely an antecedent of B (that is, B is guaranteed by A, like in the case _man belongs to some animal_), or A and B might be both antecedents and consequents of each other (i.e., A belongs to all B and B belongs to all A; for example, _rectilinear figure whose interior angles equal two right angles_ and _triangle_). _A belongs to all B_ clearly must correspond to either the second or last case. So, if _A belongs to all B_ is true there will be a true statement _B belongs to some A_ that corresponds to the same fact.

## The three figures

All Aristotelian syllogisms have three terms, with the one common to the two premises called the _middle_, the other two terms called the _extremes_, with the one that is affirmed or denied of something else in the conclusion called the _major_, and the one that has something affirmed or denied of it called the _minor_.

Aristotle divides the syllogisms into three _figures_ based on the placement of the middle term. And within the three figures, there are various _moods_, that is, combinations of the quantity (universal or particular) and quality (affirmative or negative) of the statements. In total, Aristotle recognizes 14 valid types of syllogisms.

### The first figure

In the first figure, the middle term both has something stated of it and is stated of something else. There are four moods within this figure recognized as deductions by Aristotle:

A belongs to all B, B belongs to all C, therefore A belongs to all C.

A belongs to all B, B belongs to some C, therefore A belongs to some C.

A belongs to no B, B belongs to all C, therefore A belongs to no C.

A belongs to no B, B belongs to some C, therefore A does not belong to some C.

For example: all animals are substances, all humans are animals, so all humans are substances; all walking things are moving, some humans are walking, so some humans are moving; no animals engage in photosynthesis, all dogs are animals, so no dog engages in photosynthesis; no even number is odd, some prime is an even number, so not all prime numbers are odd.

Aristotle says that all of the deductions in this figure are perfect (in the sense described above; that is, the statements alone are sufficient to make the conclusion evident). It is not clear whether such a distinction can really be made between this and the other two figures; while we might say that the validity is self-evident, we might plausibly say this in other cases as well.

Unlike, for example, the definition of a conditional in modern logic, the definitions provided by Aristotle of course do not allow one to establish the validity by means of something like a truth-table.

Aristotle’s occasional phrasing of one term’s being ‘in’ another might suggest that he is visualizing some containing relation, something like a Venn diagram, where say some circle A contains some circle B, which contains some circle C, so that A also contains C. But this can be used in all figures, and so does not set apart the first figure.

We could also use the following method: with two universal affirmative premises, we could take an arbitrary instance of C, say D, and it must be a B, since otherwise an instance of C could be found such that B is not predicated of it; and since D is also a B, and all Bs are A, for the same reason, D is an A; but D was taken as an arbitrary instance of C, so A belongs to all C. In the case where the minor premise is particular, the instance cannot be arbitrary but must be one of the Cs that is in fact a B. But while exposition is not sufficient in the second figure, it is sufficient in the third (and Aristotle acknowledges that exposition can be used in the third figure), so this does not distinguish the first from the third (and the third is said to be imperfect).

Of course, even if the validity of the first figure is not more immediately evident than all of the others, the first figure syllogisms clearly are valid.

### The second figure

In the second figure, the middle term is predicated of both extremes.

The four valid moods are the following:

A belongs to no B, A belongs to all C, therefore B belongs to no C.

A belongs to no B, A belongs to some C, therefore B does not belong to some C.

A belongs to all B, A belongs to no C, therefore B belongs to no C.

A belongs to all B, A does not belong to some C, therefore B does not belong to some C.

The first of those listed above can be validated by conversion: since the universal negative is convertible, B belongs to no A, and A belongs to all C, therefore, B belongs to no C. The second can likewise be validated in the same way: B belongs to no A, and A belongs to some C, therefore B does not belong to some C. Again in the third, A belongs to no C, so C belongs to no A and A belongs to all B, so C belongs to no B and B belongs to no C.

The last syllogism cannot be validated by conversion, since the terms in a particular negative cannot be converted, and the universal affirmative is only convertible with a particular affirmative. However, it can be validated by a _reductio ad absurdum_. Suppose that B belongs to all C, then since A belongs to all B, it follows that A belongs to all C, but it was assumed that A does not belong to some C, and so B does not belong to some C (the contradictory of _B belongs to all C_). This can also be shown by taking one of the Cs, say D, that A does not belong to, so that D belongs to no A, and A belongs to all B, so D belongs to no B, and B to no D; but D was one of the Cs, so B does not belong to some C.

### The third figure

In the third figure, the extremes are predicated of the middle term. There are six valid moods in this figure:

A belongs to all C, and B belongs to all C, therefore A belongs to some B.

A belongs to all C, and B belongs to some C, therefore A belongs to some B.

A belongs to no C, and B belongs to all C, therefore A does not belong to some B.

A belongs to no C, and B belongs to some C, therefore A does not belong to some B.

A belongs to some C, and B belongs to all C, therefore A belongs to some B.

A does not belong to some C, and B belongs to all C, therefore A does not belong to some B.

The first five moods listed above can all be validated by conversion. In the first four, the minor premise can be converted to the particular affirmative, leading to either a particular affirmative conclusion in the first figure for the first two, or particular negative conclusion in the first figure for the third and fourth. In the case of the fifth, B belongs to all C, and C belongs to some A, so B belongs to some A and A belongs to some B.

The last one cannot be validated by conversion, since the particular negative is not convertible and the universal affirmative is not convertible to a universal, but a _reductio_ can be used. Suppose that A belongs to all B, then since B belongs to all C, A belongs to all C, but A failed to belong to some C, therefore A fails to belong to some B. Alternatively, take one of the Cs that A does not belong to, D, so A does not belong to D, but D is a B (since it is a C and B belongs to all C), so A does not belong to some B.

## Other syllogisms

In addition to the syllogisms that result in a conclusion where the major is affirmed or denied of the minor, there are several cases where no such conclusion can be reached, but there is a necessary result regarding the minor’s relation to the major. Of course, this can only be the case if the conclusion is a particular negative, since this is the only type of statement that cannot be converted (in the case of syllogisms with any other kind of conclusion, conclusions can be drawn either about the major’s relation to the minor or the minor’s relation to the major).

Aristotle states that this is the case whenever there is no deduction but one premise is a universal negative and the other is affirmative (1.7).

That is, he notes the following cases:

In the first figure:

A belongs to all B, B belongs to no C, so C does not belong to some A.

A belongs to some B, B belongs to no C, so C does not belong to some A.

In the second figure:

A belongs to some B and to no C, so C does not belong to some B.

In the third figure:

A belongs to all C, B belongs to no C, so B does not belong to some A.

A belongs to some C, B belongs to no C, so B does not belong to some A.

Note that in the other cases with a universal negative premise and affirmative premise, there is a deduction about the major’s relation to the minor (No-All, No-Some in the first figure; No-All, No-Some, All-No in the second figure; No-All, No-Some in the third figure).

If A belongs to all B, and B belongs to no C, then since C belongs to no B (by conversion), and B belongs to some A (by conversion), C does not belong to some A; likewise if A belongs to some B. If A belongs to some B and to no C, then since C belongs to no A and A to some B, C does not belong to some B. If A belongs to all C, and B belongs to no C, then since B belongs to no C and C belongs to some A, B does not belong to some A; likewise if A belongs to some C.

There are two other cases with a necessary result that are not mentioned by Aristotle. Given that the context where he discusses this is that of commonalities between the figures, it is unclear whether this was an oversight or not.

The two cases not mentioned by Aristotle are the following:

A does not belong to some B, but A belongs to all C, so C does not belong to some B.

A belongs to all C, B does not belong to some C, so B does not belong to some A.

These two cases can be shown by _reductio_. In the first case, suppose that C belongs to all B, then since A belongs to all C and C belongs to all B (by supposition), A belongs to all B; but it was assumed that A does not belong to some B, so it must be the case that C does not belong to some B. In the second case, suppose that B belongs to all A, then since B belongs to all A, and A belongs to all C, B belongs to all C; but B failed to belong to some C, and so B fails to belong to some A.

Despite the fact that there is a necessary entailment, these cases (both the ones mentioned by Aristotle and the ones not mentioned) are not recognized as deductions by Aristotle (he says ‘a deduction does not result’). So, there is a question as to why he did not recognize these as deductions.

Actually, in the cases in the second and third figures, besides the assumptions discussed below, the only thing that distinguishes the major and minor is what is desired to be stated of what in the conclusion (or what is in fact stated of what), and the order of the premises. We could otherwise consider the minor to be the major and vice versa, so that the cases in the second and third figure are just moods in the second and third figure that have already been covered.

It might be that Aristotle assumed that the major is of greater abstraction or otherwise of greater extent than the minor (so one thing can be stated ‘naturally’ of another; see 1.27). For example, the major might be _animal_ and the minor might be _human_; or the major might be a quality such as _white_ and the minor might be a substance term such as _man_ or _animal_. If this is assumed, it would be obvious from that alone that the minor does not belong to some of the major (if the major is such as to be predicated of a wider variety of terms than the minor, then of course the minor can be said not to belong to all of the major).

As said above, in the second or third figure, besides assumptions about the relative extent of the terms, the deductions are not really distinct. However, in the first figure, the major and minor are also distinguished by their relation to the middle term: the major is stated of the middle, and the middle is stated of the minor; so it is only in these cases that the deductions are really distinct. If the last term (the one that the middle is stated of) is of greater extent than the first term, then the middle must be either less than the last or greater than the first, so unnatural predication must be used in the premises to get the natural predication in the conclusion (assuming that the three terms are not of equal extent). This is perhaps why Aristotle does not accept the deduction _C belongs to all (or some) B, B belongs to no A, so A does not belong to some C_.

However, we cannot go so far as to say that facts about the relative extent of the terms are implied by the premises so that the deductions are invalid. If we did say this, then conversions could not be used to validate syllogisms. We would need to say that once conversion is used to validate the syllogisms, the syllogisms with the converted statements do not have the other implications, but they otherwise do have the implications. Of course, that would be a stipulation, and one could deny that one is implying such a thing and make the syllogism, so that the conclusion will follow without the assertion of anything false.

## Statements in Aristotle’s logic as necessary, a priori truths

It is clearly best to interpret statements in Aristotelian logic as necessary a priori truths.

First, consider that premises might be interpreted empirically. I might say that all swans are white, this is a swan, so this is white; if the major premise is an assumption based on my previous experience of seeing swans, the argument would be fallacious. It does not follow from the fact that the swans I have seen previously have been white that this swan is white. It would be absurd to see a black swan (if we consider them swans) and insist that the swan is white based on this; if the premise is interpreted this way, the conclusion is not necessary or rationally compelling.

Now, if instead one interprets universal premises as covering all actual instances of something, where this is understood to cover all instances past, present, or future, then the conclusion will be necessitated. But of course I have no way of knowing that this is true if the premise is contingent.

And if we cannot enumerate all actual instances of something, we surely cannot enumerate instances of something across all possible worlds. And so we cannot consider the terms as merely standing for sets of possible objects, but we must understand them as universals. For example, color belongs to all white, so if something is white, we can conclude that it is colored. But we do not know the first premise by considering all possible white objects, but instead by considering white as a universal (as something that can be multiply instantiated), and considering white in this way makes it clear that it is a color, so that all white things are colored.

It might be objected that if we consider all the statements as eternal truths, this will not allow for certain arguments that we should allow for, which lead to non-necessary conclusions about the actual world. For example, light-colored belongs to all white, and white belongs to Socrates, so that light-colored belongs to Socrates. But if Socrates were to get a tan, the minor would no longer be true. However, we must understand the minor as referring to this possible version of Socrates, so that it will be a necessary truth, since it is a necessary truth that every white Socrates is white. Our knowledge about the actual world is not based directly on the syllogism, but instead on our belief that that possible instance of Socrates is in fact the actual instance.

## The completeness of Aristotelian logic

### Aristotle’s attempted proof

Aristotle attempts to show that he has covered all possible deductions (1.23).

Any deduction must prove either ‘probatively or hypothetically’ ‘either that something belongs or that it does not, and this either universally or in part’. First probative deductions are considered.

Any group of statements that entail a statement about some term must include some statement about that term. But the conclusion we seek is about both A and B (all statements must have two terms). So the statements must include at least a statement about A and a statement about B. But it cannot be that the statements are the same, since if A is stated of B, this would be begging the question. (We might add that if B is stated of A in a way that is convertible, this would also beg the question; and if B is stated of A in a way that is not convertible, the conclusion we seek will not be immediately entailed anyway.) So it is clear that all valid deductions must include at least two separate statements, one about A, and one about B. But while A cannot be directly stated of B, it must be that the statements relate A to B in some way, which they cannot do if the statements have no common term. And there are three ways of having a common term, either A will be predicated of C and C of B (he does not mention the possibility of predicating B of C and C of A; see the _Other syllogisms_ section above), or C of A and B, or A and B of C; and these correspond to the three figures. A deduction could also be made using several middle terms, but this will simply be a chain of deductions; ultimately there must be two statements, one about A and the middle term and one about B and the middle term.

Once this has been established, Aristotle talks about ‘hypothetical deductions’. In the case of the _reductio ad impossibile_, a probative deduction is made to an absurd conclusion, and from this it is concluded that the contradictory of the supposition is true. And likewise other hypothetical deductions are supposed to work this way – they have two parts, one is a probative deduction, and the other is not a deduction but a ‘hypothesis’ that allows some other conclusion than what has been deduced to be made. So since the part that is deductive is a probative deduction and probative deductions are covered by the three figures, so is the deductive part of hypothetical deductions.

### The necessity of a middle term

Now, one might question the step of the argument that claims that there must be a middle term, since he does not offer much justification. But it is clear that it cannot be that the mere presence of the terms A and B suffices for a conclusion, or else any arbitrary statement about A and any arbitrary statement about B will lead to the conclusion of A’s relation to B that is appropriate for the mood and figure. We could then conclude, for example, from the fact that two and two equals four and whatever equals five is odd that two and two is odd – since deductions of the same form are valid, then if we assume that any deduction of this form is valid, so will this deduction be valid, and the premises are true, so that the conclusion will be true. And the example of _belongs to all_ was arbitrary. If there is no requirement of a middle term, then all that is required is that a true statement of the relevant sort is made of A, and one of B. And if this is the only requirement, then we can even derive contradictions, since for whatever combination is required for a negative conclusion and whatever is required for a universal affirmative, we can find a true statement of the relevant sort about A in both cases and a true statement of the relevant sort about B in both cases (at least this is the case for most terms), so that contradictory conclusions can be drawn. For example: even belongs to all two, and number belongs to all even, and likewise if all is replaced by some; and even belongs to no prime greater than two, and prime greater than two belongs to no even, and likewise if we say it does not belong to some; and odd belongs to all three, and number belongs to all odd; and odd belongs to no two, and equals-two to no odd, and likewise if we say it does not belong to some. So for any combination required, we can get a combination for a true statement about even and a true statement about odd, so that even belongs to all and not to all odd.

### Hypothetical syllogisms

Recall that Aristotle talked about proving something ‘hypothetically’. There is some dispute about what Aristotle meant when talking about such cases. Aristotle considers _reductio ad impossibile_ as an example of such a thing, and also other cases where some conclusion is made other than the conclusion of the deduction. Now, from his remarks (in 1.23 and 1.44), it is clear that these are not some type of syllogism distinct from the three figures, but rather they are cases where some syllogism is used, and then some ‘hypothesis’ is used to make a conclusion. He says in 1.44 ‘[b]ut the agreement does not come from a deduction, but from an hypothesis’.

Some have suggested that the ‘hypothesis’ is a supposition; in the case of a _reductio_, it would be the statement that is being supposed for the sake of showing that it leads to a false conclusion. This is supported by the fact that he sometimes refers to that as a ‘hypothesis’. But in the case of a _reductio_, we would never accept something as true because it follows from what was supposed; even if someone attempts to make a _reductio_ but is unable to reach an impossible conclusion, there would be no issue with remaining agnostic. Yet it seems that in other cases the hypothesis is meant to be treated as if it is true (he gives an example of ‘if a man should suppose that unless there is one faculty of contraries, there cannot be one science’; 1.44).

Perhaps then we should say that the hypothesis is some sort of rule of inference: in the case of a _reductio_ it might be a rule such that if something false follows from a statement, we reject that statement; in other cases, it might be some rule that is agreed to (Aristotle says that other cases of hypothetical syllogisms rely on some sort of agreement).

Alternatively, we could say that a supposition of some sort is relied on in both cases (but not that a conditional can count as a supposition): in the case of a _reductio_, we suppose something to show that it leads to something false so that we can reject the initial supposition; in the other cases, we might, for example, suppose that virtue is knowledge to show that this entails that virtue is taught (or at least say, even if we do not prove it, that under the supposition that virtue is knowledge, it follows that virtue is taught), and then later show that virtue is knowledge, so that the eventual conclusion that virtue is taught relies on our having previously supposed that virtue is knowledge for the purpose of showing some entailment.

Historically, so-called hypothetical syllogisms have often been equated with conditional arguments in Stoic logic (similar to modern propositional logic); Anthony N. Speca’s _Hypothetical Syllogistic and Stoic Logic_ discusses the history. But even if the hypothesis is akin to a conditional statement in some cases, Aristotle clearly thinks that a hypothesis plus a single premise is not sufficient for a deduction; he says that there must be a deduction and then the conclusion is reached by a hypothesis (and the former deduction is not taken to establish the hypothesis). So perhaps we can say that if virtue is knowledge, then it is taught, and then prove by a syllogism in one of the figures that virtue is knowledge, and then conclude that virtue is taught (this example is from Plato’s _Meno_); but it would not be enough, according to Aristotle, to say that if virtue is knowledge, then it is taught and virtue is knowledge, so it is taught. Of course, if we already know that virtue is knowledge, and we know how to prove from that premise that virtue is taught, there would be no point in saying that if virtue is knowledge, then it is taught, rather than just directly proving it; this might explain why Aristotle did not accept such cases.

### Deduction using conditionals

The absence of conditionals is probably the biggest complaint one might have about Aristotle’s logic, and is perhaps the most plausible counter-example to his argument that the three figures cover all deductions.

One might say that conditionals are a species of statement that Aristotle does not cover. However, perhaps we could understand _if P, then Q_ as _entailed by P belongs to Q_. But in that case, one might want to say that it can be deduced that A belongs (or does not belong) to B, even though separate statements are not made about A and B. Perhaps P entails Q, and Q stands for _A belongs to B_, so that if we then state P, it follows that A belongs to B, even though there was no middle term. Or, to have a middle term, we could interpret the argument in the following way: true belongs to P and its entailments, entailed by P belongs to Q, so that true belongs to Q. So that if Q stands for _A belongs to all B_, then _A belongs to all B_ is true, so A belongs to all B; but there is still no middle term for the terms A and B.

First, in modern logic, the conditional is generally interpreted as a material conditional. But it seems that arguments of this sort are question-begging. The truth of the material conditional is dependent on the truth values of the statements within the conditional; _if P, then Q_ is true if and only if it is not the case that P is true and Q is false. Unless the conditional is a tautology, we cannot know whether it is true unless we know the truth values of P and Q. So in the case that we want to conclude Q and we know that P is true, we must already know that Q is true, or else the conditional would be false. One way people try to get around this problem is instead to use a _strict conditional_, so that the conditional is a necessary truth. But we might know that it is a necessary truth because both the antecedent and consequent are necessary truths.

It must be that we know the truth of the conditional because we can show that Q follows from P, rather than because we know what the truth values of the antecedent and consequent are. But if we prove that Q follows from P again using a conditional, the same problem arises. To avoid an infinite regress, we must establish the conditional by some other means.

We could use an Aristotelian syllogism to show that Q follows from P. For example, if we want to establish that if virtue is knowledge, then virtue is taught, we could say that all knowledge is taught, virtue is knowledge, so virtue is taught; if we know that all knowledge is taught, then it has been shown that if it can be established that virtue is knowledge, it must be the case that virtue is taught. Unlike in the case of a material conditional, the infinite regress does not arise, because we can make use of self-evident premises. But the truth of a non-tautological material conditional is not self-evident independently of the truth of the antecedent and consequent, and the truth of a statement that one statement can be derived from another is not self-evident, so the conditional itself cannot be self-evident.

But even if all arguments using conditionals must ultimately rely on an Aristotelian syllogism, we still might say that such arguments are a counter-example to the completeness of Aristotle’s logic (I mean by _completeness_ simply that it covers all possible deductions). If we do say that this is a counter-example to what Aristotle says, then there is a question as to where his attempted proof went wrong. It seems that we should say in that case that the false premise is his assumption that a statement about both A and B is necessarily question-begging, since it could be that the statement is about a statement about both A and B; so that there does not need to be separate statements about A and B. So there would be two kinds of probative deductions, one direct, the other indirect by means of statements about statements. But in the latter case, there still must be ultimate reliance on the former case, so that Aristotle would be correct insofar as he is claiming that ultimately one must rely on the three figures for all deductions, which would still be a significant vindication.

The question, of course, of whether they are deductions is separate from whether they are useful. It is at least useful as a summary to say that you accept that Q is true because it follows from P, and P is true, since it can then be discussed whether P really is true and whether Q really follows from P.

### Disjunctive arguments

Another important potential counter-example is that of disjunctive arguments. Similar things can be said about this case as was said about conditionals. Since the truth of _P or Q_ in modern propositional logic is determined by the truth values of P and Q, it again seems that an argument of the sort _P or Q, not-P, therefore Q_ would be question-begging, since we must already know that Q is true for the disjunction. Again, if we were to try to prove _P or Q_, we must ultimately rely either on conditionals or disjunctions, so to avoid an infinite regress an Aristotelian syllogism must be used.

However, we can also know the disjunctive premise if the premise is logically necessary, such as _P or not-P_. We can get more complicated premises as well by means of logical division. However, even if the first premise is not question-begging, the second premise will be: to say that not-not-P is the same as to say that P.

Instead of disjunctive statements, we can consider cases of disjunctive predication. In fact, Aristotle considers such a case in 1.31: immortal or mortal belongs to all animals, and man is an animal; he says that some then try to conclude that mortal belongs to all man, but instead the conclusion is only that immortal or mortal belongs to all man. Now, you might think that we can have a deduction of the sort _immortal or mortal belongs to all man, immortal belongs to no man, so mortal belongs to all man_. But immortal is the same as not-mortal, so to say that immortal belongs to no man has the same meaning as saying that mortal belongs to all man.

## License

To the extent possible under law, the author has waived all copyright and related or neighboring rights to this work. See the [Creative Commons Zero](https://creativecommons.org/publicdomain/zero/1.0/) for more information.
