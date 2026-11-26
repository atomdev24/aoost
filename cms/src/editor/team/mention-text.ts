/** The @word being typed at the end of the text ("Can @je" → "je"), or null. */
export const mentionQuery = (text: string): string | null => /(?:^|\s)@([\w.-]*)$/.exec(text)?.[1] ?? null;

/** Replace the @word being typed with the person's handle ("jess" for jess@aerobotics.com). */
export const completeMention = (text: string, email: string) => text.replace(/@([\w.-]*)$/, `@${email.split("@")[0]} `);
