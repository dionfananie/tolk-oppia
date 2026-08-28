import type { ChatMessage } from "~/lib/providers";

const TAG_STYLES: Record<string, string> = {
	grammar: "bg-warn/15 text-warn",
	vocab: "bg-accent/15 text-accent-dark",
	strong: "bg-success/15 text-success",
};

type Props = {
	message: ChatMessage;
	who?: string;
	tags?: string[];
};

export function ChatBubble({ message, who, tags }: Props) {
	const isUser = message.role === "user";
	return (
		<div
			className={`flex gap-3 rounded-lg p-4 ${
				isUser ? "bg-surface" : "border border-line-soft bg-paper"
			}`}
		>
			<div className="min-w-0">
				<div className="mb-1 flex items-center gap-2">
					<span className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-muted">
						{isUser ? "You" : who ?? "Coach"}
					</span>
					{tags?.map((tag) => (
						<span
							key={tag}
							className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TAG_STYLES[tag] ?? "bg-surface text-muted"}`}
						>
							{tag}
						</span>
					))}
				</div>
				<p className="whitespace-pre-wrap text-base leading-[1.45] text-ink">
					{message.content}
				</p>
			</div>
		</div>
	);
}

export function TypingIndicator({ who }: { who?: string }) {
	return (
		<div className="flex gap-3 rounded-lg border border-line-soft bg-paper p-4">
			<div className="min-w-0">
				<p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-muted">
					{who ?? "Coach"}
				</p>
				<span className="flex items-center gap-1.5">
					{[0, 150, 300].map((delay) => (
						<span
							key={delay}
							className="size-2 animate-bounce rounded-full bg-accent"
							style={{ animationDelay: `${delay}ms` }}
						/>
					))}
				</span>
			</div>
		</div>
	);
}
