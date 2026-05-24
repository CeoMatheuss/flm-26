import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, AlertTriangle, CheckCircle2, Bug, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestReport {
  system: string;
  status: 'pass' | 'fail';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'none';
  message: string;
}

export const AutoTestSystem = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<TestReport[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const runTests = async () => {
    setIsRunning(true);
    setProgress(10);
    setReport([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('auto-test-system');
      
      if (error) throw error;
      
      setProgress(100);
      setReport(data.report || []);
      setSummary(data.summary);
      toast.success('Testes concluídos com sucesso!');
    } catch (error: any) {
      console.error('Test error:', error);
      toast.error('Erro ao executar testes automáticos');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="text-blue-500 w-8 h-8" />
            FLM 26 QA Center
          </h1>
          <p className="text-gray-400">Sistema de Diagnóstico e Testes Automáticos</p>
        </div>
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 px-6"
        >
          {isRunning ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Play size={18} />}
          {isRunning ? 'EXECUTANDO TESTES...' : 'INICIAR TESTES COMPLETOS'}
        </Button>
      </div>

      {isRunning && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Analisando sistemas...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-slate-800" />
          </CardContent>
        </Card>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800 text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-white">{summary.total_tests}</div>
              <div className="text-xs text-gray-400 uppercase">Testes Totais</div>
            </CardContent>
          </Card>
          <Card className="bg-green-950/20 border-green-900/30 text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{summary.passed}</div>
              <div className="text-xs text-green-400 uppercase">Aprovados</div>
            </CardContent>
          </Card>
          <Card className="bg-red-950/20 border-red-900/30 text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">{summary.failed}</div>
              <div className="text-xs text-red-400 uppercase">Falhas</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-950/20 border-orange-900/30 text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-500">{summary.critical_bugs}</div>
              <div className="text-xs text-orange-400 uppercase">Críticos</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Bug className="text-gray-400" size={20} />
            Relatório Detalhado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {report.length > 0 ? (
              <div className="space-y-3">
                {report.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      {item.status === 'pass' ? (
                        <CheckCircle2 className="text-green-500" size={20} />
                      ) : (
                        <AlertTriangle className={item.severity === 'critical' ? 'text-red-500' : 'text-orange-500'} size={20} />
                      )}
                      <div>
                        <div className="font-medium text-white">{item.system}</div>
                        <div className="text-sm text-gray-400">{item.message}</div>
                      </div>
                    </div>
                    <Badge variant={item.status === 'pass' ? 'outline' : 'destructive'} className="uppercase text-[10px]">
                      {item.severity !== 'none' ? item.severity : 'ok'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500">
                Nenhum teste executado ainda. Inicie os testes para ver o relatório.
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
