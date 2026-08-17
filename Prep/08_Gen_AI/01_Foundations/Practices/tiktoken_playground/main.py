import tiktoken

enc = tiktoken.encoding_for_model("gpt-4o-mini")

examples = [
    # basics
    "Hello",
    "hello",
    "Hello!",
    "Hello world",
    "Hello, world!",

    # spaces & formatting
    "Hello  world",
    " Hello world",
    "Hello world ",
    "Hello\nworld",
    "Hello\tworld",

    # casing
    "AI",
    "Ai",
    "aI",
    "ai",

    # punctuation
    ".",
    "..",
    "...",
    "?!",
    "!!!",

    # emojis
    "🙂",
    "😂",
    "😂😂😂",
    "👩‍💻",
    "👨‍👩‍👧‍👦",

    # numbers
    "1",
    "10",
    "100",
    "2025",
    "3.14159",

    # words vs subwords
    "token",
    "tokens",
    "tokenization",
    "tokenize",
    "unbelievable",

    # languages
    "hello",
    "hola",
    "bonjour",
    "こんにちは",
    "你好",
    "안녕하세요",

    # programming
    "print('hello')",
    "const x = 10;",
    "def hello():",
    "if (x == 10) { return true; }",

    # prompts
    "Summarize this text",
    "Summarize the following text in one sentence",
    "You are a helpful AI assistant",

    # weird / edge cases
    "",
    " ",
    "    ",
    "\n",
    "\n\n\n",
]

for text in examples:
    tokens = enc.encode(text)
    decoded = enc.decode(tokens)

    print("=" * 60)
    print(f"TEXT: {repr(text)}")
    print(f"TOKEN COUNT: {len(tokens)}")
    print(f"TOKENS: {tokens}")
    print(f"DECODED: {repr(decoded)}")
