"use client";

import * as React from "react";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Folder, ShieldAlert, CheckCircle, ScanSearch, Plus, ArrowRight } from 'lucide-react';
import { getDashboardStats, listScans, DashboardStats, Scan } from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      listScans()
    ]).then(([statsRes, scansRes]) => {
      setStats(statsRes);
      setRecentScans(scansRes.scans.slice(0, 5)); // Just take top 5 for dashboard
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const statCards = [
    { title: 'Total Projects', value: stats?.totalProjects || 0, icon: Folder, color: 'text-blue-500' },
    { title: 'Total Scans', value: stats?.totalScans || 0, icon: ScanSearch, color: 'text-indigo-500' },
    { title: 'Critical CVEs', value: stats?.criticalCves || 0, icon: ShieldAlert, color: 'text-red-500' },
    { title: 'Clean Projects', value: stats?.cleanProjects || 0, icon: CheckCircle, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Welcome back! Here&apos;s a quick overview of your security posture.</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Scan
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '-' : stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Recent Scans</h2>
          {recentScans.length > 0 && (
            <Link href="/dashboard/scans" className="text-sm font-medium text-primary flex items-center hover:underline">
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          )}
        </div>
        
        {loading ? (
          <div className="h-32 flex items-center justify-center border border-dashed rounded-md bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500">Loading scans...</span>
          </div>
        ) : recentScans.length === 0 ? (
          <Card className="border-dashed bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ScanSearch className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No scans yet</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                Connect a repository to start generating SBOMs and analyzing vulnerabilities.
              </p>
              <Link href="/dashboard/projects/new">
                <Button variant="outline">Start your first scan</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden bg-white dark:bg-gray-950">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Scan ID</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {recentScans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                      <td className="px-4 py-4 font-mono text-xs text-gray-900 dark:text-white">{scan.id}</td>
                      <td className="px-4 py-4">
                        <Badge variant={scan.status === 'done' ? 'default' : scan.status === 'failed' ? 'destructive' : 'secondary'} className="capitalize">
                          {scan.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-gray-500">
                        {new Date(scan.created_at).toLocaleDateString()} at {new Date(scan.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link href={`/dashboard/scans/${scan.id}`}>
                          <Button variant="ghost" size="sm">View Report</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
