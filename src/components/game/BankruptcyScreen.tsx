import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RotateCcw, PlusCircle, LogOut } from 'lucide-react';
import { ClubShield } from './ClubShield';

interface BankruptcyScreenProps {
  clubName: string;
  shieldConfig?: any;
  onReactivate: () => void;
  onCreateNew: () => void;
  onSignOut: () => void;
}

export function BankruptcyScreen({ 
  clubName, 
  shieldConfig, 
  onReactivate, 
  onCreateNew, 
  onSignOut 
}: BankruptcyScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-md border-destructive/50 bg-card shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full scale-150" />
              <ClubShield 
                club={{ name: clubName, shield_config: shieldConfig }} 
                size={80} 
                className="grayscale opacity-60"
              />
              <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground p-1 rounded-full shadow-lg">
                <AlertCircle size={20} />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">Clube Falido</CardTitle>
          <CardDescription className="text-base mt-2">
            Seu clube faliu por má gestão financeira.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">
          <div className="bg-muted/50 p-4 rounded-lg border text-sm text-muted-foreground leading-relaxed">
            O clube <strong>{clubName}</strong> permaneceu no saldo negativo por mais de 30 dias e não está mais acessível.
            Todos os jogadores, contratos e investimentos foram perdidos.
          </div>
          <p className="text-center text-sm font-medium">
            Escolha entre reativar seu clube ou começar um novo projeto do zero.
          </p>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button 
            variant="default" 
            className="w-full h-12 text-base font-semibold gap-2"
            onClick={onReactivate}
          >
            <RotateCcw size={18} />
            REATIVAR TIME
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-12 text-base font-semibold gap-2"
            onClick={onCreateNew}
          >
            <PlusCircle size={18} />
            CRIAR NOVO TIME DO ZERO
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="mt-2 text-muted-foreground gap-2"
            onClick={onSignOut}
          >
            <LogOut size={14} />
            Sair da conta
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
