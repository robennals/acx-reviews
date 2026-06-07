---
title: 'Working With Contracts: What Law School Doesn''t Teach You by Charles M. Fox'
author: Unknown
reviewAuthor: Anonymous
contestId: 2021-book-reviews
contestName: 2021 Book Reviews
year: 2021
publishedDate: '2021-01-01T00:00:00.000Z'
slug: working-with-contracts-what-law-school-doesnt-teach-you-by-charles-m-fox
wordCount: 6640
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
