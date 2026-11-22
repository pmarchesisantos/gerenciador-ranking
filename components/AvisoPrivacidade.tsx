import React from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { contatoSuporte } from '../services/legal';

/**
 * Resumo do tratamento de dados (LGPD) mostrado no cadastro. É um ponto de
 * partida: os termos de uso e a política de privacidade completos precisam de
 * revisão jurídica antes de abrir as vendas.
 */
const AvisoPrivacidade: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
       onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="bg-gray-900 w-full max-w-xl border border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 shrink-0">
        <h3 className="text-base font-bold text-white flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-500" /> Privacidade e termos</h3>
        <button onClick={onClose} aria-label="Fechar" className="text-gray-500 hover:text-white"><X size={18} /></button>
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 text-sm text-gray-300 leading-relaxed">
        <section>
          <h4 className="text-white font-bold mb-1">Que dados pedimos e por quê</h4>
          <p>Nome do clube, nome do responsável, e-mail, celular e CPF ou CNPJ. Usamos para criar o seu acesso,
            cobrar a assinatura e falar com você sobre ela. Não vendemos nem compartilhamos esses dados para marketing.</p>
        </section>
        <section>
          <h4 className="text-white font-bold mb-1">Pagamento</h4>
          <p>A cobrança é feita pelo Asaas, instituição de pagamento autorizada pelo Banco Central. Os dados do cartão
            são digitados na página do próprio Asaas e nunca passam pelos nossos servidores. O CPF/CNPJ fica com o
            Asaas, que precisa dele para emitir a cobrança; no nosso sistema guardamos só uma versão mascarada.</p>
        </section>
        <section>
          <h4 className="text-white font-bold mb-1">Dados dos seus jogadores e clientes</h4>
          <p>Os dados que o clube cadastra (jogadores, telefones, consumo no bar) pertencem ao clube. O Stack Club
            apenas os armazena e processa para prestar o serviço, com acesso restrito à conta do clube.</p>
        </section>
        <section>
          <h4 className="text-white font-bold mb-1">Seus direitos</h4>
          <p>Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento, por {contatoSuporte()}.
            Ao cancelar, o acesso segue até o fim do período já pago.</p>
        </section>
        <section>
          <h4 className="text-white font-bold mb-1">Assinatura</h4>
          <p>A cobrança é recorrente (mensal ou anual, conforme a escolha) até o cancelamento, que pode ser feito no
            próprio app, em "Minha assinatura". O acesso é liberado quando o pagamento é confirmado.</p>
        </section>
      </div>
    </div>
  </div>
);

export default AvisoPrivacidade;
