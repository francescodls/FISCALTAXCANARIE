/**
 * Skeleton Loaders per la sezione Dichiarazioni
 * Mostrano placeholder animati durante il caricamento
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Componente base skeleton
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

/**
 * Skeleton per il Wizard di compilazione
 */
export function WizardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="w-32 h-10" />
            <Skeleton className="w-24 h-8" />
          </div>
        </div>
      </div>

      {/* Steps bar */}
      <div className="bg-white border-b sticky top-[65px] z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="w-24 h-10 flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardHeader className="border-b bg-slate-50/50">
            <div className="flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="w-48 h-6" />
                <Skeleton className="w-64 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Form fields skeleton */}
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="w-24 h-4" />
                  <Skeleton className="w-full h-10" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Skeleton className="w-32 h-4" />
              <Skeleton className="w-full h-24" />
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <Skeleton className="w-32 h-10" />
          <Skeleton className="w-16 h-6" />
          <Skeleton className="w-32 h-10" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton per la lista dichiarazioni
 */
export function DeclarationListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="w-40 h-5" />
                  <Skeleton className="w-24 h-4" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="w-20 h-6 rounded-full" />
                <Skeleton className="w-24 h-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton per la dashboard admin
 */
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="w-12 h-8" />
                  <Skeleton className="w-20 h-4" />
                </div>
                <Skeleton className="w-12 h-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Skeleton className="flex-1 h-11" />
            <Skeleton className="w-40 h-11" />
            <Skeleton className="w-32 h-11" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="border-b">
          <Skeleton className="w-48 h-6" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="w-40 h-5" />
                    <Skeleton className="w-32 h-4" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-5" />
                  <Skeleton className="w-20 h-6 rounded-full" />
                  <Skeleton className="w-24 h-2 rounded-full" />
                  <Skeleton className="w-20 h-8" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton per il dettaglio pratica modal
 */
export function DeclarationDetailSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Info cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="w-20 h-4" />
                  <Skeleton className="w-28 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <Skeleton className="w-48 h-6" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <Skeleton className="w-32 h-4" />
              <Skeleton className="w-12 h-4" />
            </div>
            <Skeleton className="w-full h-3 rounded-full" />
            <div className="grid grid-cols-4 gap-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Skeleton;
