import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { GenerateScreen } from './screens/GenerateScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { IssuerScreen } from './screens/IssuerScreen';
import { useAppStore } from './store';

export default function App() {
  const { 
    activeTab, 
    setActiveTab, 
    customers, 
    addCustomer, 
    profiles, 
    addProfile, 
    updateProfile, 
    history, 
    addDocument 
  } = useAppStore();

  const getTitle = () => {
    switch (activeTab) {
      case 'generate': return 'Gerador de Documentos';
      case 'customers': return 'Banco de Clientes';
      case 'history': return 'Histórico';
      case 'issuer': return 'Configurações do Emissor';
      default: return 'App';
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col">
      <TopBar title={getTitle()} />
      
      <div className="flex-1">
        {activeTab === 'generate' && (
          <GenerateScreen 
            customers={customers} 
            profiles={profiles} 
            onSaveDocument={addDocument} 
            onGoToHistory={() => setActiveTab('history')}
          />
        )}
        {activeTab === 'customers' && (
          <CustomersScreen 
            customers={customers} 
            onAddCustomer={addCustomer} 
          />
        )}
        {activeTab === 'history' && (
          <HistoryScreen 
            history={history} 
            profiles={profiles}
          />
        )}
        {activeTab === 'issuer' && (
          <IssuerScreen 
            profiles={profiles} 
            onSaveProfile={(p) => {
              const exists = profiles.find(existing => existing.id === p.id);
              if (exists) {
                updateProfile(p);
              } else {
                addProfile(p);
              }
            }} 
          />
        )}
      </div>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
