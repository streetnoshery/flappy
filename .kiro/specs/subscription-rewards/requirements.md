# Requirements Document

## Introduction

This document defines the requirements for a Subscription-Based Engagement & Rewards System on the Flappy social media platform. The feature introduces a subscription model where users can subscribe to unlock reward-based interactions. When subscribed users engage with posts (likes, reactions) authored by other subscribed users, both parties can earn coins. Accumulated coins can be converted into real money once predefined thresholds are met. The system must enforce strict eligibility rules and include anti-abuse protections.

## Glossary

- **Subscription_Service**: The backend service responsible for managing user subscription status, including subscribing and unsubscribing.
- **Reward_Engine**: The backend service responsible for calculating, awarding, and tracking coin earnings triggered by engagement events.
- **Coin_Ledger**: The persistent data store that records all coin transactions (credits and debits) for each user, including the reason and timestamp.
- **Conversion_Service**: The backend service responsible for validating coin-to-money conversion eligibility and processing withdrawal requests.
- **Subscriber**: A user who has an active subscription on the platform.
- **Non_Subscriber**: A user who does not have an active subscription.
- **Coin**: The virtual currency unit earned through engagement on the platform.
- **Engagement_Event**: A like or reaction performed by a Subscriber on another user's post.
- **Post_Owner**: The user who authored a given post.
- **Coin_Threshold**: The minimum number of coins a user must accumulate before requesting a conversion to real money.
- **Engagement_Threshold**: The minimum number of qualifying Engagement_Events a post must receive from Subscribers before the Post_Owner can convert coins earned from that post.
- **Abuse_Detector**: The component responsible for identifying and preventing fraudulent or spam engagement patterns.
- **Subscribe_Button**: The UI element displayed on every user profile that allows the viewing user to subscribe or unsubscribe.
- **Coin_Balance**: The current total of unconverted coins held by a Subscriber.
- **Wallet_Dashboard**: The frontend page where Subscribers can view their Coin_Balance, transaction history, and initiate conversions.

## Requirements

### Requirement 1: User Subscription Management

**User Story:** As a user, I want to subscribe to the rewards program from any user profile page, so that I can participate in the engagement rewards system.

#### Acceptance Criteria

1. THE Subscribe_Button SHALL be displayed on every user profile page for authenticated users.
2. WHEN an authenticated user clicks the Subscribe_Button, THE Subscription_Service SHALL toggle the user's subscription status between active and inactive.
3. WHEN a user subscribes successfully, THE Subscription_Service SHALL persist the subscription status and the subscription start date to the User record.
4. WHEN a user unsubscribes, THE Subscription_Service SHALL set the subscription status to inactive and record the unsubscription date.
5. THE Subscribe_Button SHALL display "Subscribe" when the viewing user is not subscribed and "Subscribed" when the viewing user is already subscribed.
6. WHEN a user's subscription status changes, THE Subscription_Service SHALL return the updated subscription status in the API response within 500ms.

### Requirement 2: Coin Earning on Engagement

**User Story:** As a subscribed user, I want to earn coins when I engage with posts and when other subscribers engage with my posts, so that I am rewarded for active participation.

#### Acceptance Criteria

1. WHEN a Subscriber performs an Engagement_Event on a post owned by another Subscriber, THE Reward_Engine SHALL credit a predefined number of coins to the Post_Owner's Coin_Balance.
2. WHEN a Subscriber performs an Engagement_Event on a post owned by another Subscriber, THE Reward_Engine SHALL credit a predefined number of coins to the engaging Subscriber's Coin_Balance.
3. WHEN a Non_Subscriber performs an Engagement_Event, THE Reward_Engine SHALL NOT award coins to any party.
4. WHEN a Subscriber performs an Engagement_Event on a post owned by a Non_Subscriber, THE Reward_Engine SHALL NOT award coins to any party.
5. WHEN a Subscriber removes an Engagement_Event (unlike), THE Reward_Engine SHALL deduct the previously awarded coins from both the Post_Owner and the engaging Subscriber.
6. THE Reward_Engine SHALL record each coin transaction in the Coin_Ledger with the user ID, amount, event type, related post ID, and timestamp.

### Requirement 3: Coin Balance and Transaction History

**User Story:** As a subscribed user, I want to view my coin balance and transaction history, so that I can track my earnings and understand my reward activity.

#### Acceptance Criteria

1. THE Wallet_Dashboard SHALL display the Subscriber's current Coin_Balance.
2. THE Wallet_Dashboard SHALL display a paginated list of coin transactions sorted by most recent first.
3. WHEN a Subscriber navigates to the Wallet_Dashboard, THE Coin_Ledger SHALL return the transaction history including the amount, event type, related post ID, and timestamp for each entry.
4. WHILE a user is a Non_Subscriber, THE Wallet_Dashboard SHALL display a message indicating that subscription is required to access rewards features.

### Requirement 4: Coin-to-Money Conversion

**User Story:** As a subscribed user, I want to convert my earned coins into real money, so that I can monetize my engagement on the platform.

#### Acceptance Criteria

1. WHEN a Subscriber requests a coin conversion, THE Conversion_Service SHALL verify that the Subscriber's Coin_Balance meets or exceeds the Coin_Threshold.
2. WHEN a Subscriber requests a coin conversion, THE Conversion_Service SHALL verify that the Subscriber has received at least the Engagement_Threshold number of qualifying Engagement_Events from distinct Subscribers.
3. IF the Subscriber's Coin_Balance is below the Coin_Threshold, THEN THE Conversion_Service SHALL reject the request and return an error message stating the minimum required balance.
4. IF the Subscriber has not met the Engagement_Threshold, THEN THE Conversion_Service SHALL reject the request and return an error message stating the minimum required engagements.
5. WHEN a conversion request is approved, THE Conversion_Service SHALL deduct the converted coins from the Subscriber's Coin_Balance and record the conversion in the Coin_Ledger.
6. WHEN a conversion request is approved, THE Conversion_Service SHALL create a pending payout record with the converted amount, conversion rate, and payout status.
7. THE Wallet_Dashboard SHALL display the current Coin_Threshold and Engagement_Threshold values so the Subscriber can track progress toward eligibility.

### Requirement 5: Subscription Eligibility Enforcement

**User Story:** As a platform operator, I want the system to enforce subscription-based eligibility for all reward operations, so that only paying subscribers benefit from the rewards system.

#### Acceptance Criteria

1. WHEN a Non_Subscriber performs an Engagement_Event, THE Reward_Engine SHALL process the engagement as a standard interaction without triggering any coin transactions.
2. WHEN a Subscriber performs an Engagement_Event on a post owned by a Non_Subscriber, THE Reward_Engine SHALL process the engagement as a standard interaction without triggering any coin transactions.
3. WHEN a user unsubscribes, THE Subscription_Service SHALL retain the user's existing Coin_Balance but prevent further coin earning until the user resubscribes.
4. WHEN a previously unsubscribed user resubscribes, THE Subscription_Service SHALL restore access to the user's existing Coin_Balance and re-enable coin earning.
5. IF a user attempts to access the Wallet_Dashboard without an active subscription, THEN THE Wallet_Dashboard SHALL display a prompt to subscribe and restrict access to conversion features.

### Requirement 6: Anti-Abuse and Fraud Prevention

**User Story:** As a platform operator, I want the system to detect and prevent fraudulent engagement patterns, so that the rewards system maintains integrity.

#### Acceptance Criteria

1. THE Abuse_Detector SHALL enforce a maximum number of rewarded Engagement_Events per Subscriber per day (rate limit).
2. WHEN a Subscriber exceeds the daily Engagement_Event rate limit, THE Abuse_Detector SHALL process subsequent engagements as standard interactions without awarding coins.
3. THE Abuse_Detector SHALL prevent a Subscriber from earning coins by engaging with the same post more than once.
4. THE Abuse_Detector SHALL flag accounts that exhibit patterns of reciprocal engagement exclusively between a small set of Subscribers (engagement farming).
5. IF the Abuse_Detector flags an account, THEN THE Reward_Engine SHALL suspend coin earning for the flagged account until manual review is completed.
6. THE Abuse_Detector SHALL prevent a Subscriber from earning coins by engaging with posts authored by the same Subscriber (self-engagement prevention).

### Requirement 7: Subscription Status in User Profile API

**User Story:** As a frontend developer, I want the user profile API to include subscription status, so that the UI can conditionally render subscription-related elements.

#### Acceptance Criteria

1. WHEN a user profile is requested via the API, THE Subscription_Service SHALL include the subscription status (active or inactive) and subscription start date in the response.
2. WHEN a user's own profile is requested, THE Subscription_Service SHALL include the Coin_Balance in the response.
3. THE Subscription_Service SHALL include a boolean field indicating whether the viewing user is subscribed in all user profile API responses.
