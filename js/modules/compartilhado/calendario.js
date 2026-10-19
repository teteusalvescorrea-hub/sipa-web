// Datas civis: UTC é usado apenas para aritmética, nunca para converter o dia local.
export function dataValida(iso) {
    return typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso)
        && Number(iso.slice(0, 4)) >= 1900 && Number(iso.slice(0, 4)) <= 9999
        && Number.isFinite(new Date(`${iso}T12:00:00Z`).getTime())
        && new Date(`${iso}T12:00:00Z`).toISOString().slice(0, 10) === iso;
}
export const hojeBrasil = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
export function agoraBrasil(instante = new Date()) {
    const partes = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(instante).map(p => [p.type, p.value]));
    return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}`;
}
export const dataPorExtenso = iso => new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
export function somarDias(iso, dias) {
    const data = new Date(`${iso}T12:00:00Z`); data.setUTCDate(data.getUTCDate() + dias);
    return data.toISOString().slice(0, 10);
}
export const diaSemana = iso => new Date(`${iso}T12:00:00Z`).getUTCDay();
export const formatarData = iso => dataValida(iso) ? iso.split("-").reverse().join("/") : "—";
export function pascoa(ano) {
    const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = (h + l - 7 * m + 114) % 31 + 1;
    return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
// Leis 662/1949, 6.802/1980 e 14.759/2023. Datas facultativas não fecham a unidade.
// Paixão: observada no calendário federal, mas a aplicação ao CFC depende de lei
// municipal (Lei 9.093/1995, art. 2). A adoção pela unidade é configurada na grade e deve ser validada pela API.
export function feriadosBrasileiros(ano) {
    const fixos = [["01-01", "Confraternização Universal"], ["04-21", "Tiradentes"], ["05-01", "Dia do Trabalho"],
        ["09-07", "Independência do Brasil"], ["10-12", "Nossa Senhora Aparecida"], ["11-02", "Finados"],
        ["11-15", "Proclamação da República"], ["11-20", "Consciência Negra"], ["12-25", "Natal"]];
    const p = pascoa(ano);
    return [...fixos.map(([dia, nome]) => ({ data: `${ano}-${dia}`, nome, tipo: "nacional" })),
        { data: somarDias(p, -2), nome: "Paixão de Cristo", tipo: "religioso" },
        ...[-48, -47].map(d => ({ data: somarDias(p, d), nome: "Carnaval", tipo: "facultativo" })),
        { data: somarDias(p, 60), nome: "Corpus Christi", tipo: "facultativo" }].sort((a, b) => a.data.localeCompare(b.data));
}
export function datasDoMes(iso) {
    const inicio = `${iso.slice(0, 7)}-01`;
    const offset = (diaSemana(inicio) + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => somarDias(inicio, i - offset));
}
