type Mark = "garden" | "leaf" | "orbit" | "star";
export function EditorialMark({variant = "garden"}: {variant?: Mark}) {
  if (variant === "star") return <svg className="v5-mark v5-mark-star" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.15" aria-hidden="true"><path d="M60 9c4 31 9 42 51 51-40 6-48 15-51 51C54 77 46 67 9 60 46 54 55 45 60 9Z"/><circle cx="60" cy="60" r="10"/><path d="M22 25l8 7M97 94l-9-8M95 25l-8 8M25 95l9-8"/></svg>;
  if (variant === "leaf") return <svg className="v5-mark v5-mark-leaf" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M60 106V43M59 84C29 88 15 66 16 47c28-2 40 12 43 37ZM61 66c1-29 15-46 42-48 1 29-13 45-42 48Z"/><path d="M29 59c12 3 22 12 30 25M87 39c-8 8-17 18-26 27"/><path d="M41 105h38"/></svg>;
  if (variant === "orbit") return <svg className="v5-mark v5-mark-orbit" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><circle cx="60" cy="60" r="34"/><ellipse cx="60" cy="60" rx="48" ry="16" transform="rotate(-34 60 60)"/><circle cx="60" cy="60" r="7" fill="currentColor" stroke="none"/><circle cx="95" cy="38" r="5" fill="currentColor" stroke="none"/></svg>;
  return <svg className="v5-mark v5-mark-garden" viewBox="0 0 320 320" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="160" cy="146" r="112" strokeDasharray="2 11" opacity=".45"/>
    <path d="M160 272V115M159 205c-57-6-75-37-72-74 42 5 70 31 72 74ZM161 178c3-59 27-81 72-86 0 47-25 76-72 86Z"/><path d="M106 155c19 11 34 29 53 50M213 116c-14 20-31 43-52 62"/>
    <path d="M91 270c21-20 46-20 69 2 24-22 50-22 72-2M121 289h79M160 115V76"/>
    <path d="M159 80c-23-14-25-32-7-49 19 12 24 29 7 49Z"/>
    <path d="M60 88v26M47 101h26M256 215v18M247 224h18M246 51l6-13M271 61l14-5"/>
  </svg>;
}
