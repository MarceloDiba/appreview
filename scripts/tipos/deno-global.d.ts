// O `Deno` que as funcoes do Supabase usam, declarado o suficiente para o
// `tsc` nao o confundir com um nome que ninguem definiu.
//
// Isto NAO e uma tipagem do Deno. E o minimo para que o guarda
// `check-nome-que-nao-existe` possa distinguir "usou o runtime" de "usou uma
// variavel que nao existe" — que era a diferenca invisivel que deixou passar
// um `texto.slice()` sobre um `texto` inexistente.
declare const Deno: {
  env: { get(nome: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};
