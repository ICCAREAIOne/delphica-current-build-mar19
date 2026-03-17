import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Users,
  Search,
  Plus,
  UserCheck,
  UserX,
  Activity,
  ChevronRight,
  SortAsc,
  SortDesc,
  Filter,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

type SortField = "lastName" | "createdAt" | "updatedAt" | "status";
type SortDir = "asc" | "desc";

export default function PatientList() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data: patients, isLoading } = trpc.patients.list.useQuery(undefined);
  const { data: searchResults, isLoading: searchLoading } = trpc.patients.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 2 }
  );
  const { data: stats } = trpc.patients.stats.useQuery(undefined);

  const displayPatients = useMemo(() => {
    let list = searchQuery.length > 2 ? (searchResults ?? []) : (patients ?? []);

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }

    // Sort
    list = [...list].sort((a, b) => {
      let av: string | number | Date = "";
      let bv: string | number | Date = "";
      if (sortField === "lastName") {
        av = `${a.lastName} ${a.firstName}`;
        bv = `${b.lastName} ${b.firstName}`;
      } else if (sortField === "createdAt") {
        av = new Date(a.createdAt);
        bv = new Date(b.createdAt);
      } else if (sortField === "updatedAt") {
        av = new Date(a.updatedAt);
        bv = new Date(b.updatedAt);
      } else if (sortField === "status") {
        av = a.status;
        bv = b.status;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [patients, searchResults, searchQuery, statusFilter, sortField, sortDir]);

  const paginated = displayPatients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(displayPatients.length / PAGE_SIZE));

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const statusColor = (s: string) => {
    if (s === "active") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (s === "inactive") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <SortAsc className="h-3 w-3 opacity-30" />;
    return sortDir === "asc"
      ? <SortAsc className="h-3 w-3 text-blue-600" />
      : <SortDesc className="h-3 w-3 text-blue-600" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isLoading ? "Loading…" : `${displayPatients.length} of ${patients?.length ?? 0} patients`}
            </p>
          </div>
          <Link href="/patients/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="h-4 w-4" />
              New Patient
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Total Patients",
              value: stats?.total ?? patients?.length ?? 0,
              icon: <Users className="h-5 w-5 text-blue-600" />,
              bg: "bg-blue-50",
            },
            {
              label: "Active",
              value: stats?.active ?? patients?.filter((p) => p.status === "active").length ?? 0,
              icon: <UserCheck className="h-5 w-5 text-emerald-600" />,
              bg: "bg-emerald-50",
            },
            {
              label: "Inactive / Discharged",
              value:
                (stats?.inactive ?? patients?.filter((p) => p.status !== "active").length ?? 0),
              icon: <UserX className="h-5 w-5 text-amber-600" />,
              bg: "bg-amber-50",
            },
          ].map((s) => (
            <Card key={s.label} className="border border-slate-200 shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${s.bg}`}>{s.icon}</div>
                  <div>
                    <p className="text-xs text-slate-500">{s.label}</p>
                    <p className="text-xl font-bold text-slate-900">
                      {isLoading ? <Skeleton className="h-6 w-10 inline-block" /> : s.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or MRN…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="discharged">Discharged</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="border border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <button
                className="col-span-3 flex items-center gap-1 text-left hover:text-slate-700"
                onClick={() => toggleSort("lastName")}
              >
                Patient <SortIcon field="lastName" />
              </button>
              <span className="col-span-2">MRN</span>
              <span className="col-span-2">DOB / Age</span>
              <span className="col-span-2">Conditions</span>
              <button
                className="col-span-1 flex items-center gap-1 hover:text-slate-700"
                onClick={() => toggleSort("status")}
              >
                Status <SortIcon field="status" />
              </button>
              <button
                className="col-span-1 flex items-center gap-1 hover:text-slate-700"
                onClick={() => toggleSort("updatedAt")}
              >
                Updated <SortIcon field="updatedAt" />
              </button>
              <span className="col-span-1" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading || (searchQuery.length > 2 && searchLoading) ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="px-4 py-3 grid grid-cols-12 gap-2">
                    <Skeleton className="col-span-3 h-4" />
                    <Skeleton className="col-span-2 h-4" />
                    <Skeleton className="col-span-2 h-4" />
                    <Skeleton className="col-span-2 h-4" />
                    <Skeleton className="col-span-1 h-4" />
                    <Skeleton className="col-span-1 h-4" />
                  </div>
                ))}
              </div>
            ) : paginated.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No patients found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {paginated.map((patient) => {
                  const dob = new Date(patient.dateOfBirth);
                  const age = Math.floor(
                    (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)
                  );
                  const conditions = (patient.chronicConditions ?? []).slice(0, 2);
                  return (
                    <Link key={patient.id} href={`/patients/${patient.id}`}>
                      <div className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-blue-50/40 cursor-pointer transition-colors">
                        <div className="col-span-3">
                          <p className="font-medium text-slate-900 text-sm">
                            {patient.lastName}, {patient.firstName}
                          </p>
                          <p className="text-xs text-slate-400">{patient.gender}</p>
                        </div>
                        <div className="col-span-2 text-sm text-slate-600 font-mono">{patient.mrn}</div>
                        <div className="col-span-2 text-sm text-slate-600">
                          {format(dob, "MM/dd/yyyy")}
                          <span className="text-xs text-slate-400 ml-1">({age}y)</span>
                        </div>
                        <div className="col-span-2 flex flex-wrap gap-1">
                          {conditions.map((c) => (
                            <Badge key={c} variant="outline" className="text-xs px-1.5 py-0 border-slate-200 text-slate-600">
                              {c.length > 16 ? c.slice(0, 14) + "…" : c}
                            </Badge>
                          ))}
                          {(patient.chronicConditions?.length ?? 0) > 2 && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0 border-slate-200 text-slate-400">
                              +{(patient.chronicConditions?.length ?? 0) - 2}
                            </Badge>
                          )}
                        </div>
                        <div className="col-span-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(patient.status)}`}>
                            {patient.status}
                          </span>
                        </div>
                        <div className="col-span-1 text-xs text-slate-400">
                          {format(new Date(patient.updatedAt), "MM/dd")}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, displayPatients.length)} of{" "}
              {displayPatients.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
