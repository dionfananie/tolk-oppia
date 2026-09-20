# TOLK Pricing

TOLK uses a minute-based credit system. Users only need to think about how much practice time they have available instead of managing individual sessions.

## Pricing

| Package | Practice Credit | Approx. Hours | Price | Effective Price |
|---|---:|---:|---:|---:|
| Try | 90 minutes | 1.5 hours | Rp15,000 | ~Rp167/min |
| Practice | 270 minutes | 4.5 hours | Rp42,000 | ~Rp156/min |
| Intensive | 900 minutes | 15 hours | Rp125,000 | ~Rp139/min |
| Custom | Flexible | Flexible | Rp10,000/hour | ~Rp167/min |

## Custom Credit

Users who do not want to purchase a predefined package can purchase exactly the amount of practice time they need.

The Custom Credit interface should use a slider.

### Examples

- 30 minutes → Rp5,000
- 60 minutes → Rp10,000
- 90 minutes → Rp15,000
- 180 minutes → Rp30,000
- 360 minutes → Rp60,000

### Base Rate

- Rp10,000 / hour
- Approximately Rp167 / minute

## Credit Usage

Credits are measured using practice time.

For example, if a user has 270 minutes remaining and practices for 23 minutes, their new balance becomes 247 minutes remaining.

Users can stop a conversation at any time. Unused minutes remain in their account and can be used for another conversation.

There is no requirement to finish a fixed-length session.

## Billing Behavior

A conversation consumes credit based on elapsed practice time.

Example:

```text
Starting balance:    270 minutes
Conversation:         23 minutes
--------------------------------
Remaining balance:   247 minutes
```

The timer starts when the practice conversation begins and stops when the conversation is ended.

Temporary pauses, network reconnection, and other exceptional states should be handled separately so users are not charged unfairly.

## Product Presentation

Although credits are stored internally in seconds, the UI should primarily display them as minutes.

Example:

```text
184 minutes remaining
≈ 3 hours of practice
```

For larger packages, both minutes and approximate hours can be displayed.

Example:

```text
900 minutes
≈ 15 hours of English practice
Rp125,000
```

## Internal Credit Model

Internally, credits should be stored in seconds to avoid rounding problems.

- 1 minute = 60 credit seconds
- 1 hour = 3,600 credit seconds

### Package Credit Values

| Package | Practice Credit | Credit Seconds |
|---|---:|---:|
| Try | 90 minutes | 5,400 credit seconds |
| Practice | 270 minutes | 16,200 credit seconds |
| Intensive | 900 minutes | 54,000 credit seconds |

## Suggested Core Entities

- `credit_balance`
- `credit_transaction`
- `conversation`
- `usage_record`
- `purchase`

Every purchase adds credit to the user’s balance.

Every completed practice interval creates a usage transaction that deducts credit.

## Initial Pricing Strategy

The initial pricing intentionally prioritizes user acquisition and product validation rather than maximizing gross margin.

The main assumptions are:

- Base retail price: Rp10,000/hour
- STT: streaming speech-to-text provider
- LLM: DeepSeek Flash
- TTS: initially Qwen TTS or another cost-efficient provider
- Actual infrastructure cost will be measured during the POC

Pricing should be reviewed after collecting real usage data.

## Important Metrics to Measure

- STT audio minutes per practice hour
- TTS characters generated per practice hour
- LLM input tokens
- LLM output tokens
- Average conversation duration
- Average credit consumption per user
- Actual cost per practice hour
- Gross margin per package

## Pricing Goal

The initial target is to keep TOLK simple:

> Buy minutes. Practice whenever you want. Stop whenever you want. Your remaining minutes stay available.

This avoids complicated session rules and gives users a clear understanding of exactly how much practice time they have purchased.
