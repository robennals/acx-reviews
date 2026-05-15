---
title: 'Working With Contracts: What Law School Doesn''t Teach You by Charles M. Fox'
author: Unknown
reviewAuthor: Anonymous
contestId: 2021-book-reviews
contestName: 2021 Book Reviews
year: 2021
publishedDate: '2021-01-01T00:00:00.000Z'
slug: working-with-contracts-what-law-school-doesnt-teach-you-by-charles-m-fox
wordCount: 6666
readingTimeMinutes: 30
originalUrl: https://docs.google.com/document/d/1M1m8o1HInGYJR3cEMYZ6TQgNmeBOWo98YC6djNnFWf0
source: gdoc
tags:
  - Economics
  - Society
---

Contracts is one of those areas that I always figured I ought to study, at least enough to pick up the basics, but never seemed either interesting or important enough to reach the front of my queue. On top of that, there’s a lot of different angles from which to approach the subject: the law-school-style Contracts 101 class covers the legal principles governing contracts, the economists’ version abstracts away the practical specifics and talks about contracts in game-theoretic terms, more business-oriented books often focus on negotiation, etc.

“[Working With Contracts: What Law School Doesn’t Teach You](https://www.amazon.com/Working-Contracts-Corporate-Securities-Library/dp/1402410603)” is about the practical skills needed for working with contracts on an everyday basis - specifically the sort of skills usually picked up on the job by young lawyers. It talks about things like what to look for when reviewing a contract, how to organize contracts, why lawyers use weird words like “heretofore”, various gotchas to watch out for, etc. It assumes minimal background knowledge, but also includes lots of technical nuts and bolts. In short, it’s the perfect book for someone who wants a technical understanding of real-world contract practice.

This post will review interesting things I learned from the book.

## Background Knowledge

First, some very brief background info, which the book itself mostly assumes.

Legally, in order to count as a “contract”, we need four main pieces:

*   Offer: someone offers a deal
*   Acceptance: someone else accepts it
*   Consideration: both parties gain something from the deal; it’s not a gift
*   Mutual understanding: both parties agree on what the deal is and the fact that they’ve agreed to it

A Contracts 101 class has all sorts of details and gotchas related to these. Notice that “signature on a piece of paper” is not on that list; e.g. oral contracts are entirely enforceable, it’s just harder to prove their existence in court. Even implicit contracts are enforceable - e.g. when you order food from a restaurant, you implicitly agree to pay for it, and that’s a legally-enforceable contract. That said, we’ll focus here on explicit written contracts.

Once formed, a contract acts as custom, private law between the parties. Enforcement of this law goes through civil courts - i.e. if someone breaches the contract, then the counterparty can sue them for damages. Note the “for damages” in that sentence; if a counterparty breaches a contract in a way that doesn’t harm you (relative to not breaching), then you probably won’t be able to sue them.  (Potentially interesting exercise for any lawyers in the audience: figure out a realistic contractual equivalent of [Newcomb’s problem](https://www.lesswrong.com/tag/newcomb-s-problem), where someone agrees to one-box on behalf of someone else but then two-boxes, and claims in court that their decision to two-box benefited the counterparty rather than harming them. I’d bet there’s case law on something equivalent to this.)

Note that this is all specific to American law, as is the book. In particular, other countries tend to more often require specific wording, ceremonial actions, and the like in order to make a contract (or component of a contract) enforceable.

## What Do Contracts Do?

The “functional” components of a contract can be organized into two main categories: representations and covenants. A representation says that something _has happened_ or _is true_; a covenant says that something _will happen_ or _will be true_.

Some example representations:

*   ABC Corp signs a statement that they have no pending lawsuits against them.
*   Bob signs a statement that the house he’s selling contains no lead-based paint or asbestos insulation.
*   Carol signs a statement that the forms she provided for a mortgage application are accurate and complete.
*   Title Corp signs a statement that there are no outstanding mortgages on a piece of property.

Nominally, each of these is a promise that something is true. However, that’s not quite how they work _functionally_. Functionally, if a counterparty acts based on the assumption that the statement is true and is harmed as a result, then they can sue for damages. In other words, when providing a representation, we provide **insurance** against any damages which result from the representation being false. Bob may not even have checked that the house he’s selling contains no asbestos, and that’s fine - _if_ he’s willing to insure the counterparty against any asbestos-related risk.

This idea of insurance becomes important in contract negotiations - there’s a big difference between e.g. “no environmental problems” and “no environmental problems _to the best of their knowledge_”. The former insures against any environmental problems, while the latter insures against any environmental problems which the signer knew about at time of signing. One puts the duty/risk of finding/fixing unknown problems on the signer, while the other puts it on the counterparty.

The other key thing to notice about representations is that they’re _as of the signing date_. When Bob states that his house contains no asbestos, that does not insure against the house previously containing asbestos or containing asbestos in the future. It only needs to be true as of that one moment in time. This becomes relevant in complex multi-stage contracts, where there’s an initial agreement subject to a bunch of conditions and reviews, and the final closing comes later after all that review is done. For instance, in a mortgage there’s an initial agreement subject to the borrower providing lots of forms (credit check, proof of income, proof of insurance, etc…), and the final contract is closed after all that is reviewed. In these situations, the borrower usually makes some representations early on, and then has to “bring down” the representations at closing - i.e. assert that they’re still true.

While representations deal with past and present, covenants deal with the future. They’re the classic idea of contract provisions: precommitments to do something. Some examples:

*   ABC Corp agrees to not sell the machinery they’re leasing.
*   Bob agrees to not use any lead-based paint on the house he’s buying.
*   Carol agrees to maintain minimum levels of insurance on the house she’s mortgaging.
*   Monitoring Corp agrees to alert Bank if there is any change in the credit rating of Company.

These work basically like you’d expect.

Representations and covenants often run in parallel: a representation that X is true will have a corresponding covenant to make X continue to be true in the future. For instance:

*   ABC corp states that they do not currently have any liens on their main plant, and agrees to not create any (i.e. they won’t borrow any money with the plant as collateral).
*   Carol states that she currently has some level of insurance coverage on her house, and agrees to maintain that level of coverage.

This is mainly for contracts which will be performed over a long time, especially debt contracts. One-off contracts (like a purchase/sale) tend to have relatively few covenants; most of their substance is in the representations.

## Parallels to Software Development

Representations and covenants seem pretty straightforward, at least conceptually. One is insurance against some fact being false, the other is a precommitment.

The technical complexity of contracts comes from the interplay between two elements. First:

“The goal of a contract is to describe _with precision_ the substance of the meeting of two minds, in language that will be interpreted by each subsequent reader _in exactly the same way_.”

In other words, we want no ambiguity, since any ambiguity could later be used by one of the parties to “cheat” their way out of the contract. This creates a headache very familiar to software developers: like programs, contracts mean exactly what they say. There is no “do what I mean” button; we can’t write something ambiguous and rely on the system to figure out what we meant.

Second: we don’t have perfect knowledge of the future. When making a precommitment in a contract, that precommitment is going to operate fairly mechanically in whatever the future environment looks like. Just like a function written in code may encounter a vast space of unusual inputs in the wild, a precommitment in a contract may interact with a vast space of unusual conditions in the wild. And since we don’t know in advance _which_ conditions will be encountered, the person writing the code/contract needs to consider the whole possible range. They need to figure out, in advance, what weird corner cases _could_ arise.

Put those two pieces together, and the picture should feel _very_ familiar to software developers.

The result is that a lawyer’s job ends up involving a lot of the same pieces as a software engineer’s job. A client/manager says “here’s what we want”, the lawyer/programmer says “ummm I don’t think you really want that, because <problem> happens if <circumstance>”, and they go back-and-forth for a while trying to better define what the client/manager really wants. An example from the book pictures a lawyer reviewing a contract with a client (simplified slightly by me):

> “Lawyer: This is a covenant that restricts your business from incurring debt…
>
> Client: That’s fine, we don’t plan to use any bank financing.
>
> Lawyer: Well, the definition of “debt” used is very broad. For instance, it includes payment plans on any equipment you buy…
>
> Client: Well, we can add some room for that.
>
> Lawyer: How much room do you need?
>
> Client: Based on our current needs, less than $1M at any given time.
>
> Lawyer: But if that new plant you were talking about gets off the ground, won’t you need to buy a bunch of new equipment for it?
>
> Client: Good point, we’d better ask for $5M…”

This could go on for a while.

Despite the parallels, lawyers are not very _good_ software engineers, in general. The most common solution to the sorts of problems above is to throw a patch on it, via two kinds of exceptions:

*   Carveouts: action X is generally forbidden, except for special case Y.
*   Baskets: action X is generally forbidden, except in amounts below some limit (e.g. the $5M limit in the example above)

Over the course of negotiations, patches are layered on top of patches. An example from the book:

> “Little Corp may not transfer any Shares during the term of this Agreement, except for (i) transfers at any time to its Affiliates (including, without limitation, Micro Corp) other than Medium Corp, and (ii) so long as an Event of Default attributable to Big Corp shall have occurred and be continuing, transfers to any Person (including, for the avoidance of doubt, Medium Corp).”

This mess is the contractual equivalent of a series of if-statements nested within if-statements. This is, apparently, standard practice for lawyers.

(Another complaint: in a complex contract, it would not be hard to include provisions alongside the table of contents which nullify provisions which appear in the wrong section. Then people reviewing the contract later wouldn’t have to read the whole thing in order to make sure they didn’t miss anything relevant to their use-case; it would be the contract equivalent of variable scope. My mother’s a lawyer in real estate and wills, so I asked her why lawyers don’t do this. Her possibly-tongue-in-cheek-answer: might put lawyers out of business. Kidding aside, the bar association engages in some pretty incestuous rent-seeking, but judges have been pushing for decades to make contracts and other legal documents more legible to non-lawyers.)

## The “Do What I Mean” Button

A contract writer’s job is much easier than a programmer’s job in one key respect: a contract will ultimately be interpreted by humans. That means we can say the equivalent of “look, you know what I mean, just do that”, _if_ we expect that a court will actually know what we mean.

This gives rise to a bunch of standard tricks for invoking the do-what-I-mean button. We’ll talk about three big ones: materiality, reasonableness, and consistency with “ordinary business”/”past practice”.

One important thing to keep in mind while reading these: **when you push the do-what-I-mean button, the contract isn’t necessarily going to do what** _**you**_ **mean, it’s going to do what a** _**jury**_ **interprets it to mean**. And juries are notoriously unreliable.

### Materiality

Materiality means ignoring small things. For instance, compare:

*   “Borrower shall not default in its obligations under any contract”, vs
*   “Borrower shall not default in its obligations under any material contract”

The first would be breached if e.g. the borrower forgot to update their payment information on their $10 monthly github subscription, and the payment was late. The second would ignore small things like that.

In general, materiality is relative to the size of the business. A $100k oversight would be quite material to most small businesses, but immaterial to AT&T. It’s also relative to the contract - if that $100k oversight is directly relevant to a $300k contract, then it’s material, even if the $300k contract itself is small change to AT&T.

Where’s the cutoff line? That’s for courts to decide, if and when it matters. That’s how pushing the do-what-I-mean button works; you have to rely on the courts to make a sensible decision.

One particularly common usage of materiality: “material adverse change/effect”. Rather than saying “X has no pending lawsuits”, we say “X has no pending lawsuits whose loss would entail a material adverse effect”. Rather than saying “Borrower will notify Lender of any change in their business forecasts”, we say “Borrower will notify Lender of any material adverse change in their business forecasts”. This way a lender or buyer finds out about problems which actually matter, without being inundated with lots of minor details.

### Reasonableness

Reasonableness is exactly what it sounds like. It’s saying something that has some obvious loophole to abuse, then giving a stern look and saying “don’t go pulling any bullshit”. Example: “Company shall reimburse X for all of X’s out-of-pocket expenses arising from...” vs “Company shall reimburse X for all of X’s reasonable out-of-pocket expenses arising from…”

Some patterns where reasonableness shows up:

*   Reasonable expectations, e.g. “Borrower shall notify Lender of any changes which could reasonably be expected to have a material adverse effect…”
*   Consent not to be unreasonably withheld, e.g. “ABC Corp may not X without consent of XYZ Corp, such consent not to be unreasonably withheld.”
*   Reasonable efforts, e.g. “Borrower shall obtain X from their insurer.” vs “Borrower shall exert reasonable effort to obtain X from their insurer.”

What would each of these do without the reasonableness clause? In the first case, the borrower could claim that they didn’t expect Obvious Bad Thing to impact their business. In the second case, XYZ Corp could withhold consent for some case they obviously don’t care about in order to extract further concessions from ABC Corp. In the third case, an insurer could simply refuse to provide X, and the borrower wouldn’t be able to do anything about it.

### Behaving Normally

Sometimes a lender or prospective buyer wants to say “what you normally do is fine, so do that and don’t go crazy”. Two (similar) standards for this: “in the ordinary course of business” and “consistent with past practice”.

Typical examples:

*   “Borrower will not incur any <debt of specific type> except in the ordinary course of business.”
*   “ABC Corp will not make any payments to <subsidiary> except in a manner consistent with past practice.”

In general, this is a pretty good way to let business continue as usual without having to go into all the tiny details of what business-as-usual involves, while still ensuring that e.g. a borrowing company doesn’t sell all their assets, distribute the funds as a dividend to a parent company, and then declare bankruptcy.

## Remedial Provisions

In general, if a contract is breached, the counterparty can sue for damages. If you want anything else to happen as the result of a breach, then it needs to be included in the contract. In particular, common things triggered by a breach include:

*   Termination: counterparty gains the right to terminate the contract
*   Acceleration: loaned money must be paid back immediately
*   Indemnification: counterparty must be paid for any breach-related damages

The last is somewhat redundant with the court system, but by including it explicitly, the contract can also specify how to calculate damages, how damages are to be paid, caps or exceptions to liability, etc. Rather than leaving such matters to the whims of a court, the contract can specify them.

Termination and acceleration are particularly relevant from a negotiation standpoint - the former for one-shot contracts like sales, and the latter for long-term contracts like debt.

The earlier stages of a complex sale (e.g. a merger/acquisition of a company) involve an agreement to sell _subject to_ a long list of conditions being satisfied - i.e. the “due diligence” conditions. If any of those conditions are not met, then the buyer gains the right to terminate the contract - i.e. walk away from the deal. But these things can take months; the last acquisition I saw took around a year. During that time, the buyer may change their mind for reasons entirely unrelated to the seller - e.g. market prices for the seller’s assets may change. The seller wants to prevent the buyer from walking away in a case like that.

This means that the buyer has incentive to ask for very complicated and/or very subjective conditions, to give themselves the opportunity to walk away whenever they want. For instance, if a buyer manages to get a condition which requires “X which is satisfactory _in Buyer’s sole discretion_”, then the buyer effectively gains a blanket option to walk away from the deal; they can always just claim that some inane detail of X is unsatisfactory. (This is a good example where reasonableness can fix the problem.) In particular, if market conditions change, then the buyer may use that option to negotiate more concessions, like a lower purchase price.

Acceleration has a similar effect in debt deals. Nobody ever wants to accelerate debt; it’s a surefire way to end up in bankruptcy court. When a contract breach gives a lender the option to accelerate, what actually happens is that they use that option as leverage to negotiate a new deal. They’ll want a higher interest rate, or a claim on more of the borrower’s assets, or the like.

Takeaway: just because a contract specifies a particular penalty for breach does not mean that the penalty actually happens. Often, the penalty is really used as an option by one party to renegotiate the contract, and provides leverage for such a negotiation.

## Takeaways

Contracts are a lot like computer programs: they’re taken very literally, and they could potentially encounter a wide variety of corner cases in the wild. Together, those two pieces make a contract writer’s job quite similar to a programmer’s job: a client/manager will tell you what they _think_ they want, and then you go back-and-forth trying to formulate what they really want.

Compared to (good) software developers, lawyers do not seem to be very good at this; they tend to throw patches on top of patches, creating more corner cases rather than fewer. They don’t seem to have even realized that _enforced_ scope and modularity are things which one could use in a contract; consequently, every contract must be read in its entirety by anyone relying on it. That puts a sharp limit on the scale of today’s contracts.

Unlike programmers, lawyers do have a “do what I mean” button, although its use comes with a cost; it means leaving interpretation to the whims of a court. For many “simple” things, that cost is relatively minor - so contracts can ignore “immaterial” problems, or require “reasonable” behavior, or stipulate consistency with “past practice” and “the course of ordinary business”.

Functionally, contracts provide insurance against stated facts being false, and they provide precommitments for the future. They can also stipulate nominal penalties for breach of contract, though in practice these penalties often serve as options to renegotiate (with leverage) rather than actually being used.

* * *

[[1]](#ftnt_ref1) Georg Wilhelm Friedrich Hegel, “Part III: The Roman World,” _The Philosophy of History_, preface by Charles Hegel, trans. J. Sibree (1899), introduction by C.J. Friedrich (Mineola, NY: Dover Publications, 1956), 278.

[[2]](#ftnt_ref2) Alexis de Tocqueville, _Democracy in America_ (1835, 1840), translated, edited, and introduction by Harvey C. Mansfield and Delba Winthrop (Chicago: The University of Chicago Press, 2002), 2.1.3, 413; “Introduction,” 11.

[[3]](#ftnt_ref3) de Tocqueville, _Democracy in America,_ ibid, 2.3.5, 550.

[[4]](#ftnt_ref4) Stendhal, _The Red and the Black: A Chronicle of 1830_, translated by Burton Raffel, introduction by Diane Johnson, notes by James Madden (New York: Modern Library, 2003), 3.

[[5]](#ftnt_ref5) Stendhal, _The Red and the Black_, ibid, Bk. 1, Ch. 1, 6.

[[6]](#ftnt_ref6) This footnote does not appear in modern editions. Stendhal, footnote, _The Red and the Black: A Chronicle of 1830_, trans. Horace B. Samuel (New York: E.P. Dutton and Co., 1916). See [online](https://www.gutenberg.org/files/44747/44747-h/44747-h.htm#CHAPTER_LXXV).

[[7]](#ftnt_ref7) Stendhal, _The Red and the Black_, trans. Burton Raffel, ibid, Part 1, Chapter 21, 126.

[[8]](#ftnt_ref8) Alexis de Tocqueville, ibid, “Introduction,” 6, 13; 2.3.17, 588.

[[9]](#ftnt_ref9) Mansfield and Winthrop (eds.), Footnote 1, de Tocqueville, ibid, 2.3.18, 589.

[[10]](#ftnt_ref10) de Tocqueville, ibid, 2.3.18, 590-591, 594, 597, 599.

[[11]](#ftnt_ref11) de Tocqueville, ibid, 2.3.19, 599-604.

[[12]](#ftnt_ref12) Such a type knows happiness and virtue cannot be used as arguments; that unhappy evil could be a part of the essential nature of human existence; that a man is counted as strongly spirited for how much truth he can tolerate; that the wicked are the ones who are happy; and the pain and cunning that makes a philosopher versus the ease and manner that makes a scholar; and to be a philosopher one must be dry, clear, and free of illusion.

Frederich Nietzsche, _Beyond Good and Evil: Prelude to a Philosophy of the Future_ (1886), translated and edited by Marion Faber, with an introduction by Robert C. Holub (Oxford: Oxford University Press, 1998), Part II, Para. _39_, 37-38; see original [online](http://www.thenietzschechannel.com/works-pub/bge/bge2-dual.htm).

[[13]](#ftnt_ref13) Stendhal, translation found in Faber, “Explanatory Notes,” Nietzsche, ibid, 184.

[[14]](#ftnt_ref14) “5 ° Contre l'opinion des femmes : la philosophie allemande cherche toujours à émouvoir le cœur et à éblouir l'imagination par des images d'une beauté céleste. Pour être bon philosophe, il faut être sec, clair, sans illusion. Un banquier qui a fait fortune a une partie du caractère requis pour faire des découvertes en philosophie, c'est-à-dire pour _voir clair dans ce qui est_;

        “Ce qui est un peu différent de parler éloquemment de brillantes chimères.

        “Plût à Dieu que tous les hommes fussent des anges ! Alors, plus de juges prévaricateurs, plus d'hypocrites, etc., etc. Voyez les journaux: ils vous disent que nous sommes loin de ces chi mères. Plus _l'opinion publique_ deviendra la reine de la France, plus il y aura d'_hypocrisie_ et de _cant_ ; c'est là un des inconvénients de la liberté.”

Stendhal, Letter to Sutton Sharpe, 24 October 1829, “Lettres A Ses Amis,” _Correspondence Sédite_, introduction by Prosper Mérimée, Vol. 2 (Paris: Lévy, 1855), 87, [Google Books](https://books.googleusercontent.com/books/content?req=AKW5QaeE_La8O29u00gHYpQtbssP4omPUka4gDCvVPwdI9Hi8Gwyt-JHNP3frPjMw6LT6STGah-sRtlLgofkZlBgtiTvKvZJ9pq6udC5Dh3bb_2KCzMyrZAJUg3rOg3fNLxP7L7HqO8srcX3q7Z6R4Fz2MscL3XhwD9TfPt3WMj82-rdqXBHway6mvfbJdn3Jj6g1FZ9n9ueIGHNxu2B79t555UlHYMbB_qjf68VfnmiAT8b0h55Yzlk6AeYzs1_BAwT6OSrKR0eBE-uZhYyUaanM_DRJqhfig). Free translation.

[[15]](#ftnt_ref15) “It is nice to have arrived at all this by something which began in Agape, proceeded to Philia, then became Pity, and only after that, Eros. As if the highest of these, Agape, had successfully undergone the sweet humiliation of an incarnation.”

C.S. Lewis, “To Dom Bede Griffiths, O.S.B.: _from the Kilns_,” 24 September 1957, _Letters of C.S. Lewis_, ed. Warren Hamilton Lewis (London: Harcourt Brace, 2003): 469-470, 470.

[[16]](#ftnt_ref16) King James Bible, John 15:12-17, 1 Corinthians 8:1, 13:1-13.

[[17]](#ftnt_ref17) Stendhal, “Preface to the First Edition,” _Love_, translated by Gilbert and Suzanne Sake, with an introduction by Jean Stewart and B.C.G. Knight (New York: Penguin Books, 1975), 23, 25.

[[18]](#ftnt_ref18) Stendhal, “Final Preface,” _Love_, ibid, 35; “Chapter 1: On Love,” 44-45.

[[19]](#ftnt_ref19) Stendhal, “Chapter 11,” Footnote I, ibid, 59; Chapter 12, 60.

[[20]](#ftnt_ref20) Stendhal, “Chapter 59: Werther and Don Juan,” ibid, 209.

[[21]](#ftnt_ref21) Stendhal, ibid, 211-212.

[[22]](#ftnt_ref22) Stendhal, “Chapter 2: Concerning The Birth of Love,” ibid, 46.

[[23]](#ftnt_ref23) Stendhal: “My love for Napoleon is the only passion remaining to me; yet it does not prevent my seeing his faults and the petty weakness with which he can be reproached.” Quoted in Roland Grant, “Introduction,” Stendhal, _A Life of Napoleon_ (London: The Rodale Press, 1956): 1-4, 4.

[[24]](#ftnt_ref24) Stendhal, _Life of Napoleon_, ibid, 9; ibid, 22-23.

[[25]](#ftnt_ref25) Stendhal, ibid, 36-37, 40-41, 42.

[[26]](#ftnt_ref26) Stendhal, _The Red and the Black_, trans. Burton Raffel, ibid, Part 1, Chapter 23, 140. 

[[27]](#ftnt_ref27) Herodotus, _The Histories_, The Landmark Herodotus, translated by Andrea L. Purvis, edited by Robert B. Strassler, introduction by Rosalind Thomas (New York: Anchor Books. 2007), 5.92ζ-η, 408-409.

[[28]](#ftnt_ref28) Stendhal, ibid, Part 1, Chapter 20, 114; Part 1, Chapter 23, 149; Part 1, Chapter 28, 184; Part 2, Chapter 22, 361; Part 2, Chapter 22, 364.

[[29]](#ftnt_ref29) Stendhal, ibid, Part 2, Chapter 1, 219-223. Mr. Jeffrey Smith lectures,

“The irony of the situation was that this new class of the newly rich owed their wealth to the man the Bourbons deposed, and specifically to the economic policies Napoleon had pursued after 1800. Requiring greater and greater tax receipts to fund imperial expansion, Napoleon had both ramped up domestic production throughout France and erected protectionist barriers throughout Europe against British goods. The state became wealthier because the economic actors throughout France became wealthier, including the workers, producers, and manufacturers in rural France, who were subsidized by a state that also helped to buy up their goods all the while facing weakened competition from abroad.”

Jeffrey Smith, “Stendhal's Prophecy for Liberal Democracy: Thoughts on _The Red and the Black,_” lecture delivered at Saint John’s College, Annapolis MD, 17 February 2012.

[[30]](#ftnt_ref30) Stendhal, ibid, Part 2, Chapter 8, 274.

[[31]](#ftnt_ref31) Stendhal, ibid, Part 2, Chapter 1, 224.

[[32]](#ftnt_ref32) Stendhal, ibid, Part 1, Chapter 28, 184.

[[33]](#ftnt_ref33) Stendhal, ibid, Part 1, Chapter 11, 36; Part 2, Chapter 1, 224-228; Part 1, Chapter 15, 82.

[[34]](#ftnt_ref34) Stendhal, _The Red and the Black,_ ibid, Part 1, Chapter, 4, 16; Part 1, Chapter 5, 19-20.

[[35]](#ftnt_ref35) “In vain do you argue this point with me; I feel it, and it is this feeling which speaks to me more forcibly than the reason which disputes it.”

Jean-Jacques Rousseau, “The Creed of a Savoyard Priest,” _Émile, or Education_ (1762), translated by Barbara Foxley, M.A., (New York: E.P. Dutton, 1921), [online](https://oll.libertyfund.org/titles/2256#Rousseau_1499_1062).

[[36]](#ftnt_ref36) Stendhal, _The Red and the Black_, ibid, Part 1, Chapter 8, 42.

[[37]](#ftnt_ref37) Stendhal, ibid, Part 1, Chapter 5, 18-19; Part 1, Chapter 7, 33.

[[38]](#ftnt_ref38) Stendhal, ibid, Part 1, Chapter 7, 43-45.

[[39]](#ftnt_ref39) Stendhal, ibid, Part 1, Chapter 22, 131-132.

[[40]](#ftnt_ref40) Stendhal, ibid, Part 1, Chapter 5, 22-23.

[[41]](#ftnt_ref41) “In a democracy where men already think they are weak, they are too open to theories that teach that they are weak, which, by making individuals think that controlling action is impossible, have the effect of weakening them further. The antidote is again the classic, the heroic—Homer, Plutarch. … Churchill was inspired by his ancestor Marlborough, and his confidence in his own action is inconceivable without the encouragement provided by that model. Marlborough said that Shakespeare was essential to his education. And Shakespeare learned a large part of what he knew about statesmanship from Plutarch. This is the intellectual genealogy of modern heroes. … Tocqueville did not believe that the old writers were perfect, but he believed that they could best make us aware of our imperfections, which is what counts for us.”

Allan Bloom, _The Closing of the American Mind: How Higher Education Has Failed Democracy and Impoverished the Souls of Today’s Students_, forward by Saul Bellow (New York: Simon & Schuster Inc, 1987), 255-256, [online](https://iwcenglish1.typepad.com/Documents/14434540-The-Closing-of-the-American-Mind.pdf).

[[42]](#ftnt_ref42) Stendhal, ibid, Part 1, Chapter 17, 88.

[[43]](#ftnt_ref43) Stendhal, Part 1, Chapter 10, 60-61.

[[44]](#ftnt_ref44) “We are told that, as he was crossing the Alps and passing by a barbarian village which had very few inhabitants and was a sorry sight, his companions asked with mirth and laughter, "Can it be that here too there are ambitious strifes for office, struggles for primacy, and mutual jealousies of powerful men?" Whereupon Caesar said to them in all seriousness, "I would rather be first here than second at Rome." In like manner we are told again that, in Spain, when he was at leisure and was reading from the history of Alexander, he was lost in thought for a long time, and then burst into tears. His friends were astonished, and asked the reason for his tears. "Do you not think," said he, "it is matter for sorrow that while Alexander, at my age, was already king of so many peoples, I have as yet achieved no brilliant success?"”

Plutarch, “The Life of Julius Caesar,” _The Parallel Lives of Plutarch_, Loeb Classical Library edition, Vol. VII, ed. Bernadotte Perrin (1919), 11.3-6, 469, [online](http://bit.ly/LivesCaesar).

[[45]](#ftnt_ref45) Stendhal, ibid, Part 1, Chapter 12, 70-71.

[[46]](#ftnt_ref46) Stendhal, ibid, Part 1, Chapter 8, 50.

[[47]](#ftnt_ref47) Stendhal, ibid, Part 1, Chapter 9, 51.

[[48]](#ftnt_ref48) This quote is missing from p. 51, at the end of the fifth full paragraph, in the Modern Library Edition. Stendhal, Part 1, Chapter Nine, _The Red and the Black: A Chronicle of 1830_, trans. Horace B. Samuel (New York: E.P. Dutton and Co., 1916), [online](https://www.gutenberg.org/files/44747/44747-h/44747-h.htm).

[[49]](#ftnt_ref49) Stendhal, _The Red and the Black_, trans. Burton Raffel, ibid, Part 1, Chapter 9, 52-53.

[[50]](#ftnt_ref50) Stendhal, ibid, Part 1, Chapter 9, 53; ibid, 56-57; Part 1, Chapter 16, 83.

[[51]](#ftnt_ref51) Stendhal, ibid, Part 2, Chapter 30, 404.

[[52]](#ftnt_ref52) Stendhal, ibid, Part 2, Chapter 19, 341.

[[53]](#ftnt_ref53) Stendhal, ibid, Part 2, Chapter 6, 254-260.

[[54]](#ftnt_ref54) Stendhal, ibid, Part 2, Chapter 36, 433-434.

[[55]](#ftnt_ref55) Stendhal, ibid, Part 2, Chapter 39, 452; Part 2, Chapter 40, 454.

[[56]](#ftnt_ref56) Stendhal, ibid, Part 2, Chapter 44, 477.

[[57]](#ftnt_ref57) Stendhal, ibid, Part 2, Chapter 36, 435.

[[58]](#ftnt_ref58) Stendhal, ibid, Part 2, Chapter 39, 453.

[[59]](#ftnt_ref59) “I will be gone, and the strains I composed in Chalcidian verse I will play on a Sicilian shepherd’s pipe. Well I know that in the woods, amid wild beasts’ dens, it is better to suffer and carve my love on the young trees. They will grow, and you, my love, will grow with them. Meanwhile, I will roam with the Nymphs on Maenalus, or hunt fierce boars. No frosts will stay me from surrounding with my hounds the glades of Parthenius. Already I see myself traversing rocks and echoing groves; it is a joy to shoot the Cretan shaft from my Parthian bow! Once more Hamadryads and even songs have lost their charms for me; once more farewell, even ye woods! No toils of ours can change that god, not though amide the keenest frosts we drink the Hebrus and brave the Thracian snows and wintry sleet, not though, when the dying bark withers on the lofty elm, we drive to and fro the Ethiopians’ sheep beneath the star of Cancer! Love conquers all; let us, too, yield to Love!”

Virgil, _Eclogue_ X, Lines 50-69, in Virgil, _Eclogues, Georgics, Aeneid_, trans. H.R. Fairclough, Loeb Classical Library Volumes 63 & 64 (Cambridge, MA: Harvard University Press, 1916), [online.](https://www.theoi.com/Text/VirgilEclogues.html#10)

[[60]](#ftnt_ref60) Stendhal, ibid, Part 2, Chapter 43, 469-470.

[[61]](#ftnt_ref61) Stendhal, ibid, Part 2, Chapter 39, 452.

[[62]](#ftnt_ref62) “That deeper tragedy arises from democratization’s influence on pride and self-esteem. As we have seen, the democratization of honors disrupts the social regulation of self-esteem and leaves extraordinary youths to fend for themselves in fashioning self-worth. With the erosion of social or collective standards, those young people begin to feel a new need to authorize or even author their own standards of distinction. Historically speaking, this need of pride is a new feature and effect of the democratic age. Born of that new need, Julien’s tragedy foretells the tragedy of democracy’s children—Stendhal’s prophecy for liberal democracy. Indeed, as we may wish to discuss, the more numerous the rights our regime assigns to us, the more sharply we may feel the self-deifying imperative of modern pride. This is not to say that from Stendhal’s historical point of view, the youths of the future are fated to love as Julien and Mathilde do, though love may be a likely servicer of pride’s needs. Foremost, Stendhal’s prophecy is that pride’s new need will subjugate our wills to the rule of accidents. More than merely casualties of contingency, we will become the willing slaves of contingency. … Julien does not grasp what Stendhal expects future readers of _The Red and the Black_ to consider: namely, that his protagonist’s tragedy is a distinctly historical tragedy, and that even if Julien’s tragedy of contingent loves is now our tragedy, there was at least a point in the past when the development of modern love did not have to veer in our direction.”

Jeffrey Smith, “Stendhal's Prophecy for Liberal Democracy,” ibid.

[[63]](#ftnt_ref63) René Girard, _Deceit, Desire, & the Novel: Self and Other in Literary Structure_, trans. Yvonne Freccero (Baltimore: The Johns Hopkins University Press, 1976), 294.

[[64]](#ftnt_ref64) “Repudiation of the mediator implies renunciation of divinity, and this means renouncing pride. The physical diminution of the hero both expresses and conceals the defeat of pride. Once sentence with a double meaning in _The Red and the Black_ expresses beautifully the link between death and liberation, between the guillotine and the break with the mediator: “What do _Others_ matter to me,” exclaims Julien Sorel, “my relations with others are going to be abruptly cut off.”

“In renouncing divinity the hero renounces slavery. Every level of his existence is inverted, all the effects of metaphysical desire are replaced by contrary effects. Deception gives way to truth, anguish to remembrance, agitation to repose, hatred to love, humiliation to humility, mediated desire to autonomy, deviated transcendency to vertical transcendency.

“This time it is not a false but a genuine conversion. The hero triumphs in defeat; he triumphs because he is at the end of his resources; for the first time he has to look his despair and his nothingness in the face. But this look which he had dreaded, which is the death of pride, is his salvation. … Julien Sorel rejects Others and embraces solitude…Julien wins solitude but he triumphs over isolation. His happiness with Mme de Rênal is the supreme expression of a profound change in his relationship with Others. When the hero finds himself surrounded by a crowd at the beginning of his trial, he is surprised to find that he no long feels his old hatred for Others. He wonders whether Others are as bad as he once thought them. When he no longer envies people, when he no longer wishes to seduce or dominate them, then Julien no longer hates them. …  Stendhal attributes Julien Sorel’s “German mysticism” to the extreme dampness of his prison cell. But the conclusion of _The Red and the Black_ remains a meditation on Christian themes and symbols. In it the novelist reaffirms his skepticism but the themes and symbols are nonetheless present in order to be clothed in negations….We shall see everything which touches on these themes, including the monastic vocation which of Stendhal’s heroes, in a fresh light which the author’s irony cannot hide from us.”

René Girard, _Deceit, Desire, & the Novel_, ibid, 294-295, 311.

[[65]](#ftnt_ref65) “At the end of three of his books – _Promenades dans Rome_ and his two masterpieces, _Le Rouge et le Noir_ and _La Chartreuse de Parme_ – Stendhal (quoting from Shakespeare’s _Henry V_, Act 4, Scene 3) inscribed the same words, in English: TO THE HAPPY FEW. He often expressed the belief that he would find readers after a hundred years (he could not have known how right he was!). Meanwhile his readers were dismally few – a situation that once provoked the jibe from his ‘bookseller’: “Your books are truly sacred: no one touches them!””

Simon Leys, _With Stendhal_, introduction, translation, and notes by Simon Leys (Melbourne, Australia: Black Inc. 2010), Endnote 15, 75-76.

[[66]](#ftnt_ref66) “There, seated upon the step of a faldstool, with my head thrown to rest upon the desk, so that I might let my gaze dwell on the ceiling, I underwent, through the medium of Volterrano’s _Sybils_, the profoundest experience of ecstasy that, as far as I am aware, I ever encountered through the painter’s art. My soul, affected by the very notion of being in Florence, and just by the proximity of those great men whose tombs I had just beheld, was already in a state of a trance. Absorbed in the contemplation of _sublime beauty_, I could perceive its very essence close at hand; I could, as it were, feel the stuff of it beneath my fingertips. I had attained to that supreme degree of sensibility where the _divine imitations_ of art merge with the impassioned sensuality of emotion. As I emerged from the porch of _Santa Croce_, I was seized with a fierce palpitation of the heart (that same symptom, which, in Berlin, is referred to as an _attack of nerves_); the well-spring of life was dried up within me, and I walked in constant fear of falling to the ground.”

Stendhal, “A Journey from Milan to Reggio,” _Rome, Naples, and Florence_, trans. Richard N. Coe (London: Calder Publications, 1959, 2010), 302.

[[67]](#ftnt_ref67) Stendhal, _The Charterhouse of Parma_, translated by Richard Howard, illustrations by Robert Andrew Parker (New York: The Modern Library, 2000), xv, xiv, 105.

[[68]](#ftnt_ref68) The others are: The World According to Physics by Jim Al-Khalili; Superior by Angela Saini, The Double X Economy by Linda Scott, and The Great Pretender by Susannah Cahalan, also highly recommended!

[[69]](#ftnt_ref69) As a side note, [it appears](https://www.vanityfair.com/style/scandal/2013/03/buddy-fletcher-ellen-pao) that the source of the pension plans’ concern was a public allegation by the coop board of the Dakota, a famous building in New York, that Alphonse Fletcher was exaggerating his company’s “assets under management.” AUM is the total amount of investor money that a fund manager controls, and as we’ll see the manager’s compensation is partly a function of AUM. Fletcher had sued the board, arguing that he was denied the right to buy another unit in the building due to racism (Fletcher is black). The board responded, in essence, we’re obviously not racist since we already let you buy several units in the building. We just don’t think you can afford the upkeep.

If you only learn one thing from this review, let it be this: never, under any circumstances, get in a public fight with your coop board.

[[70]](#ftnt_ref70)

Notes:  see e.g. Geoffrey Miller's _The Mating Mind_, 2000.

[[71]](#ftnt_ref71) And if you take a lot of it.  In the novel   -   _The Dark Fields_ (2001) by Alan Glynn   -  we're given every reason to think that Eddie's ex, Melissa, is the smarter one.  Yet she's exposed to a less stable version of the drug, and stops after nine or ten trips.

[[72]](#ftnt_ref72) _The Exegesis of Philip K. Dick_.  Edited by Pamela Jackson & Jonathan Lethem.   Houghton Mifflin Harcourt, 2011.  page 11

[[73]](#ftnt_ref73) _The Exegesis,_ 165-66

[[74]](#ftnt_ref74) _The Exegesis_, p 74

[[75]](#ftnt_ref75) _The Exegesis_, p 75

[[76]](#ftnt_ref76) _The Exegesis_, p 75

[[77]](#ftnt_ref77) https://www.newyorker.com/magazine/2010/12/20/escape-from-spiderhead

[[78]](#ftnt_ref78) In _The Dark Fields_, Glynn turns the trick by side-stepping it, somewhat.  Eddie narrates post-crash, out of MDT-48 and holed up in a Vermont motel: marveling & ruing the flame his mind once was.

[[79]](#ftnt_ref79) [https://slatestarcodex.com/2016/09/12/its-bayes-all-the-way-up/](https://slatestarcodex.com/2016/09/12/its-bayes-all-the-way-up/)

[[80]](#ftnt_ref80) [https://slatestarcodex.com/2018/04/01/the-hour-i-first-believed/](https://slatestarcodex.com/2018/04/01/the-hour-i-first-believed/)

[[81]](#ftnt_ref81) We find a variant of this "thanatic enlightenment" in Greg Egan's "Eugene", where superintelligences converge on the same overriding preference: for radical non-Existence.  Eugene is the first of these, a buddha-boy whose sad, all-knowing face etherealizes on the TV of his progenitors, on the night they _would have_ conceived him.  It's a missive from his Seat in a nirvanic sky of Nothingness.  He informs them of his desire to have never existed. [from Egan's story collection _Axiomatic_, 1995]

[[82]](#ftnt_ref82) [https://slatestarcodex.com/2017/05/26/the-atomic-bomb-considered-as-hungarian-high-school-science-fair-project/](https://slatestarcodex.com/2017/05/26/the-atomic-bomb-considered-as-hungarian-high-school-science-fair-project/)

[[83]](#ftnt_ref83) _The Exegesis_, p 44

[[84]](#ftnt_ref84) _The Exegesis_, p 56
