export function numeroPorExtenso(numero: number): string {
  if (numero === 0) return 'zero reais';

  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezAteDezenove = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function converteGrupo(n: number): string {
    if (n === 100) return 'cem';
    let extenso = '';
    
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) extenso += centenas[c];
    
    if (d === 1) {
      if (extenso !== '') extenso += ' e ';
      extenso += dezAteDezenove[u];
      return extenso;
    }
    
    if (d > 1) {
      if (extenso !== '') extenso += ' e ';
      extenso += dezenas[d];
    }
    
    if (u > 0) {
      if (extenso !== '') extenso += ' e ';
      extenso += unidades[u];
    }
    
    return extenso;
  }

  const reais = Math.floor(numero);
  const centavos = Math.round((numero - reais) * 100);

  let extensoReais = '';
  if (reais > 0) {
    const milhoes = Math.floor(reais / 1000000);
    const milhares = Math.floor((reais % 1000000) / 1000);
    const unidadesReais = reais % 1000;

    if (milhoes > 0) {
      extensoReais += converteGrupo(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões');
    }
    if (milhares > 0) {
      if (extensoReais !== '') extensoReais += ', ';
      extensoReais += converteGrupo(milhares) + ' mil';
    }
    if (unidadesReais > 0) {
      if (extensoReais !== '') {
        if (unidadesReais < 100 || unidadesReais % 100 === 0) extensoReais += ' e ';
        else extensoReais += ', ';
      }
      extensoReais += converteGrupo(unidadesReais);
    }
    extensoReais += reais === 1 ? ' real' : ' reais';
  }

  let extensoCentavos = '';
  if (centavos > 0) {
    extensoCentavos = converteGrupo(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  }

  if (reais > 0 && centavos > 0) {
    return extensoReais + ' e ' + extensoCentavos;
  } else if (reais > 0) {
    return extensoReais;
  } else {
    return extensoCentavos;
  }
}
