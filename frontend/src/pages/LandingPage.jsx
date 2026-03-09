import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar, 
  FileText, 
  Bell, 
  Shield, 
  Users, 
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  MapPin
} from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Calendar,
      title: "Calendario Scadenze Personalizzato",
      description: "Visualizza tutte le tue scadenze fiscali in un calendario intuitivo. Il nostro team ti tiene sempre aggiornato con promemoria automatici."
    },
    {
      icon: FileText,
      title: "Documenti Sempre Disponibili",
      description: "Accedi in sicurezza ai tuoi documenti fiscali, modelli, atti e contratti caricati dal nostro studio, disponibili 24/7."
    },
    {
      icon: Bell,
      title: "Comunicazioni Dirette",
      description: "Ricevi notifiche dal nostro studio per scadenze imminenti, aggiornamenti normativi e comunicazioni importanti."
    },
    {
      icon: Shield,
      title: "Massima Sicurezza",
      description: "I tuoi dati sono protetti con crittografia avanzata. Solo tu e il nostro team possiamo accedere ai tuoi documenti."
    },
    {
      icon: Users,
      title: "Assistenza Dedicata",
      description: "Il nostro team di professionisti gestisce tutte le tue pratiche fiscali con cura e precisione, tu hai tutto sotto controllo."
    },
    {
      icon: TrendingUp,
      title: "Aggiornamenti in Tempo Reale",
      description: "Ti teniamo informato su tutte le novità fiscali e tributarie delle Isole Canarie che ti riguardano."
    }
  ];

  const benefits = [
    "Accesso 24/7 alla tua documentazione",
    "Scadenze fiscali sempre sotto controllo",
    "Comunicazione diretta con il tuo commercialista",
    "Buste paga e documenti in un unico posto",
    "Note e appunti condivisi per ogni pratica"
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg font-heading">FT</span>
            </div>
            <span className="font-heading font-bold text-xl text-slate-900">Fiscal Tax Canarie</span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/login")}
              className="text-slate-600 hover:text-slate-900 font-medium"
              data-testid="header-login-btn"
            >
              Accedi
            </Button>
            <Button 
              onClick={() => navigate("/register")}
              className="bg-teal-500 hover:bg-teal-600 text-slate-900 font-semibold px-6"
              data-testid="header-register-btn"
            >
              Registrati
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-stone-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fadeIn">
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                Benvenuto nell'Area Clienti di{" "}
                <span className="text-teal-500">Fiscal Tax Canarie</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-xl">
                Il tuo studio di commercialisti di fiducia alle Isole Canarie. 
                Gestisci le tue scadenze fiscali, accedi ai documenti e rimani sempre aggiornato, 
                tutto in un'unica piattaforma dedicata.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => navigate("/register")}
                  className="bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold px-8 py-6 h-auto text-lg rounded-lg btn-press"
                  data-testid="hero-cta-btn"
                >
                  Accedi all'Area Clienti
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                  className="border-2 border-slate-200 hover:border-slate-300 text-slate-900 font-medium px-8 py-6 h-auto text-lg rounded-lg"
                  data-testid="hero-features-btn"
                >
                  Scopri i Servizi
                </Button>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-teal-500/10 rounded-3xl transform rotate-3"></div>
              <img 
                src="https://images.unsplash.com/photo-1758691737182-d42aefd6dee8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBicmlnaHQlMjBvZmZpY2UlMjB0ZWFtfGVufDB8fHx8MTc3MzA4NzUwNHww&ixlib=rb-4.1.0&q=85"
                alt="Fiscal Tax Canarie Team"
                className="relative rounded-3xl shadow-2xl object-cover w-full h-[500px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              I Nostri Servizi per Te
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Tutto ciò di cui hai bisogno per gestire le tue pratiche fiscali in modo semplice e sicuro
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 stagger-children">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-lg card-hover"
                data-testid={`feature-card-${index}`}
              >
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-teal-50 rounded-xl flex items-center justify-center mb-6">
                    <feature.icon className="h-7 w-7 text-teal-600" />
                  </div>
                  <h3 className="font-heading font-semibold text-xl text-slate-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 md:py-32 bg-stone-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-slate-900">
                Perché scegliere la nostra piattaforma?
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700 text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <Card className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8 md:p-10">
              <h3 className="font-heading font-bold text-2xl text-slate-900 mb-6">
                Sei già nostro cliente?
              </h3>
              <p className="text-slate-600 mb-8">
                Accedi all'area riservata e gestisci tutte le tue pratiche fiscali in modo semplice e veloce
              </p>
              <div className="space-y-4">
                <Button 
                  onClick={() => navigate("/login")}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold py-6 h-auto text-lg rounded-lg btn-press"
                  data-testid="cta-login-btn"
                >
                  Accedi
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate("/register")}
                  className="w-full border-2 border-slate-200 hover:border-slate-300 text-slate-900 font-medium py-6 h-auto text-lg rounded-lg"
                  data-testid="cta-register-btn"
                >
                  Nuovo Cliente
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                  <span className="text-slate-900 font-bold text-lg font-heading">FT</span>
                </div>
                <span className="font-heading font-bold text-xl">Fiscal Tax Canarie</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Il tuo partner di fiducia per la gestione fiscale alle Isole Canarie.
              </p>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-lg mb-4">Contatti</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-400">
                  <MapPin className="h-5 w-5" />
                  <span>Isole Canarie, Spagna</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <Phone className="h-5 w-5" />
                  <span>+34 XXX XXX XXX</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <Mail className="h-5 w-5" />
                  <span>info@fiscaltaxcanarie.com</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-lg mb-4">Link Utili</h4>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate("/login")}
                  className="block text-slate-400 hover:text-teal-400 transition-colors"
                >
                  Area Clienti
                </button>
                <button 
                  onClick={() => navigate("/register")}
                  className="block text-slate-400 hover:text-teal-400 transition-colors"
                >
                  Registrati
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-500">
            <p>&copy; {new Date().getFullYear()} Fiscal Tax Canarie. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
