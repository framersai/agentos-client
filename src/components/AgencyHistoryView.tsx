/**
 * @fileoverview Agency History View
 * @description Displays historical agency executions with emergent behavior insights
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Progress } from './ui/Progress';
import {
  History,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Users,
  Brain,
  ChevronDown,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { listAgencyExecutions, getAgencyExecution } from '../lib/agentosClient';

interface AgencyExecution {
  agency_id: string;
  user_id: string;
  conversation_id: string;
  goal: string;
  workflow_definition_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: number;
  completed_at?: number;
  duration_ms?: number;
  total_cost_usd?: number;
  total_tokens?: number;
  output_format?: string;
  consolidated_output?: string;
  emergent_metadata?: string;
  error?: string;
}

interface AgencySeat {
  id: string;
  agency_id: string;
  role_id: string;
  persona_id: string;
  gmi_instance_id?: string;
  status: string;
  started_at?: number;
  completed_at?: number;
  output?: string;
  error?: string;
  usage_tokens?: number;
  usage_cost_usd?: number;
  retry_count: number;
}

export const AgencyHistoryView: React.FC<{ userId: string }> = ({ userId }) => {
  const [executions, setExecutions] = useState<AgencyExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAgencyId, setExpandedAgencyId] = useState<string | null>(null);
  const [agencyDetails, setAgencyDetails] = useState<Map<string, { execution: AgencyExecution; seats: AgencySeat[] }>>(new Map());

  useEffect(() => {
    loadExecutions();
  }, [userId]);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const data = await listAgencyExecutions(userId, 20);
      setExecutions(data);
    } catch (error) {
      console.error('Failed to load agency executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (agencyId: string) => {
    if (expandedAgencyId === agencyId) {
      setExpandedAgencyId(null);
      return;
    }

    setExpandedAgencyId(agencyId);
    
    if (!agencyDetails.has(agencyId)) {
      try {
        const details = await getAgencyExecution(agencyId);
        if (details) {
          setAgencyDetails(new Map(agencyDetails.set(agencyId, details)));
        }
      } catch (error) {
        console.error(`Failed to load details for agency ${agencyId}:`, error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'destructive';
      case 'running': return 'primary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'running': return <Clock className="w-4 h-4 animate-spin" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatCost = (cost?: number) => {
    if (!cost) return '$0.00';
    return `$${cost.toFixed(4)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 animate-spin text-primary" />
          <span>Loading agency history...</span>
        </div>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Agency Executions Yet</h3>
        <p className="text-sm text-muted-foreground">
          Agency executions will appear here once you start a multi-agent workflow.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Agency Execution History</h2>
        </div>
        <Badge variant="secondary">{executions.length} total</Badge>
      </div>

      <div className="space-y-3">
        {executions.map((execution) => {
          const isExpanded = expandedAgencyId === execution.agency_id;
          const details = agencyDetails.get(execution.agency_id);
          const emergentData = execution.emergent_metadata ? JSON.parse(execution.emergent_metadata) : null;

          return (
            <Card key={execution.agency_id} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-accent/5 transition-colors"
                onClick={() => toggleExpand(execution.agency_id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <h3 className="font-semibold text-base truncate max-w-xl">{execution.goal}</h3>
                      <Badge variant={getStatusColor(execution.status)} size="sm">
                        {getStatusIcon(execution.status)}
                        <span className="ml-1">{execution.status}</span>
                      </Badge>
                      {emergentData && (
                        <Badge variant="primary" size="sm">
                          <Zap className="w-3 h-3 mr-1" />
                          Emergent
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(execution.duration_ms)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <DollarSign className="w-3 h-3" />
                        <span>{formatCost(execution.total_cost_usd)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{details?.seats.length ?? '...'} seats</span>
                      </span>
                      {emergentData && (
                        <span className="flex items-center space-x-1">
                          <Brain className="w-3 h-3" />
                          <span>{emergentData.tasksDecomposed?.length ?? 0} tasks decomposed</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(execution.started_at).toLocaleString()}
                  </div>
                </div>

                {isExpanded && details && (
                  <div className="mt-4 pt-4 border-t space-y-4" onClick={(e) => e.stopPropagation()}>
                    {/* Seats */}
                    <div>
                      <h4 className="font-medium text-sm mb-2">Agent Seats</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {details.seats.map((seat) => (
                          <div key={seat.id} className="p-3 border rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{seat.role_id}</span>
                              <Badge variant={getStatusColor(seat.status)} size="xs">
                                {seat.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <div>Persona: {seat.persona_id}</div>
                              {seat.retry_count > 0 && <div>Retries: {seat.retry_count}</div>}
                              {seat.usage_cost_usd && <div>Cost: {formatCost(seat.usage_cost_usd)}</div>}
                            </div>
                            {seat.output && (
                              <div className="text-xs bg-secondary p-2 rounded max-h-24 overflow-y-auto">
                                {seat.output.substring(0, 200)}
                                {seat.output.length > 200 && '...'}
                              </div>
                            )}
                            {seat.error && (
                              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                                {seat.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Emergent Metadata */}
                    {emergentData && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center space-x-1">
                          <Zap className="w-4 h-4 text-primary" />
                          <span>Emergent Behavior Analysis</span>
                        </h4>
                        <div className="space-y-2 text-xs">
                          {emergentData.tasksDecomposed && emergentData.tasksDecomposed.length > 0 && (
                            <div>
                              <div className="font-medium mb-1">Tasks Decomposed:</div>
                              <ul className="list-disc list-inside space-y-1">
                                {emergentData.tasksDecomposed.map((task: any) => (
                                  <li key={task.taskId}>
                                    {task.description}
                                    <Badge variant="outline" size="xs" className="ml-2">
                                      Priority: {task.priority}
                                    </Badge>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {emergentData.rolesSpawned && emergentData.rolesSpawned.length > 0 && (
                            <div>
                              <div className="font-medium mb-1">Roles Spawned:</div>
                              <div className="flex flex-wrap gap-1">
                                {emergentData.rolesSpawned.map((role: any) => (
                                  <Badge key={role.roleId} variant="secondary" size="xs">
                                    {role.roleId} ({role.personaId})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Consolidated Output */}
                    {execution.consolidated_output && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Output</h4>
                        <div className="text-xs bg-secondary p-3 rounded max-h-64 overflow-y-auto whitespace-pre-wrap">
                          {execution.consolidated_output}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

