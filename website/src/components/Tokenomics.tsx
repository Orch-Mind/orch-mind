import React from 'react';
import { Coins, TrendingUp, Shield, Users, ExternalLink, Copy } from 'lucide-react';

const Tokenomics: React.FC = () => {
  const tokenInfo = {
    name: 'OrchMind Token',
    ticker: 'ORCH',
    totalSupply: '1,000,000,000',
    contractAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5da5e',
    network: 'Ethereum',
    presalePrice: '$0.001',
    listingPrice: '$0.005'
  };

  const distribution = [
    { category: 'Community Rewards', percentage: 40, color: 'bg-blue-500' },
    { category: 'Development', percentage: 25, color: 'bg-purple-500' },
    { category: 'Marketing', percentage: 15, color: 'bg-green-500' },
    { category: 'Team', percentage: 10, color: 'bg-yellow-500' },
    { category: 'Advisors', percentage: 5, color: 'bg-pink-500' },
    { category: 'Reserve', percentage: 5, color: 'bg-indigo-500' }
  ];

  const utilities = [
    {
      icon: Users,
      title: 'Network Participation',
      description: 'Stake tokens to participate in federated training and earn rewards'
    },
    {
      icon: Shield,
      title: 'Governance Rights',
      description: 'Vote on protocol upgrades and community proposals'
    },
    {
      icon: TrendingUp,
      title: 'Model Trading',
      description: 'Buy and sell AI models and LoRA adapters on the marketplace'
    },
    {
      icon: Coins,
      title: 'Transaction Fees',
      description: 'Pay for compute resources and premium features'
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <section id="token" className="section-padding relative">
      <div className="container-custom">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text">Ecossistema ORCH</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Token brasileiro que incentiva o compartilhamento de adapters de IA e 
            recompensa contribuições para a democratização da inteligência artificial.
          </p>
        </div>

        {/* Token info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="glass-effect rounded-lg p-8 h-full">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                <Coins className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-center">Token ORCH 🇧🇷</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-300">Nome:</span>
                <span className="font-semibold">Orch-Mind</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-300">Símbolo:</span>
                <span className="font-semibold">ORCH</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-300">Propósito:</span>
                <span className="font-semibold">Democratizar IA</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-300">Origem:</span>
                <span className="font-semibold">Brasil 🇧🇷</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-300">Foco:</span>
                <span className="font-semibold">Inclusão Tech</span>
              </div>
            </div>
          </div>

          <div className="glass-effect rounded-lg p-8 h-full">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-green-600 rounded-full flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-center">Inclusão Digital</h3>
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">GRATUITO</div>
                <div className="text-gray-300">IA Acessível para Todos</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="space-y-3">
                <div className="flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    <span className="text-gray-300">Estudantes</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    <span className="text-gray-300">Microempreendedores</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    <span className="text-gray-300">Pequenas Empresas</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    <span className="text-gray-300">Universidades</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    <span className="text-gray-300">Pesquisadores</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400">Quebrando barreiras tecnológicas</div>
                <div className="text-lg font-semibold text-yellow-400">Primeira IA Federada 🇧🇷</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pre-sale banner */}
        <div className="glass-effect rounded-xl p-8 mb-16 text-center bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
          <h3 className="text-3xl font-bold mb-4">
            <span className="gradient-text">🔥 Pre-Sale Active</span>
          </h3>
          <p className="text-lg text-gray-300 mb-6">
            Get ORCH tokens at the lowest price before public launch. Limited time offer!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://presale.orch-mind.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center space-x-2"
            >
              <span>Join Pre-Sale</span>
              <ExternalLink className="w-5 h-5" />
            </a>
            <a
              href="https://pancakeswap.finance/swap?outputCurrency=0x742d35Cc6634C0532925a3b8D4C9db96C4b5da5e"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center space-x-2"
            >
              <span>Buy on PancakeSwap</span>
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Contract info */}
        <div className="glass-effect rounded-xl p-6 mb-16">
          <h3 className="text-xl font-semibold mb-4 text-center">Smart Contract</h3>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-gray-400 text-sm">Contract Address:</p>
              <p className="font-mono text-sm text-blue-400 break-all">{tokenInfo.contractAddress}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(tokenInfo.contractAddress)}
                className="btn-secondary flex items-center space-x-2 text-sm px-4 py-2"
              >
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </button>
              <a
                href={`https://etherscan.io/token/${tokenInfo.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center space-x-2 text-sm px-4 py-2"
              >
                <span>View on Etherscan</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Token distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div>
            <h3 className="text-2xl font-semibold mb-6 gradient-text">Token Distribution</h3>
            <div className="space-y-4">
              {distribution.map((item, index) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded ${item.color}`}></div>
                    <span className="text-gray-300">{item.category}</span>
                  </div>
                  <span className="font-semibold">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-semibold mb-6 gradient-text">Token Utilities</h3>
            <div className="space-y-4">
              {utilities.map((utility, index) => (
                <div key={utility.title} className="flex items-start space-x-3">
                  <utility.icon className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white mb-1">{utility.title}</h4>
                    <p className="text-gray-400 text-sm">{utility.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Roadmap preview */}
        <div className="glass-effect rounded-xl p-8 text-center">
          <h3 className="text-2xl font-semibold mb-4 gradient-text">Token Roadmap</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-green-400 mb-2">✅ Phase 1 (Complete)</h4>
              <p className="text-gray-300">Token creation, smart contract deployment, pre-sale launch</p>
            </div>
            <div>
              <h4 className="font-semibold text-yellow-400 mb-2">🔄 Phase 2 (Current)</h4>
              <p className="text-gray-300">Public listing, DEX integration, staking mechanism</p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">🔮 Phase 3 (Upcoming)</h4>
              <p className="text-gray-300">Governance launch, DAO formation, cross-chain bridge</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Tokenomics;
