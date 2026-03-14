import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type CertificateType } from "@/hooks/useCertificates";

interface Props {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  certificateType: CertificateType;
}

const OBSERVATION_CODES = [
  { code: "C1", label: "Danger present", color: "destructive" as const },
  { code: "C2", label: "Potentially dangerous", color: "destructive" as const },
  { code: "C3", label: "Improvement recommended", color: "secondary" as const },
  { code: "FI", label: "Further investigation", color: "outline" as const },
];

export function EICRFormFields({ data, onChange, certificateType }: Props) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  const observations = (data.observations as Array<{ code: string; location: string; observation: string }>) || [];

  const addObservation = () => {
    const newObservations = [...observations, { code: "", location: "", observation: "" }];
    updateField("observations", newObservations);
  };

  const updateObservation = (index: number, field: string, value: string) => {
    const newObservations = [...observations];
    newObservations[index] = { ...newObservations[index], [field]: value };
    updateField("observations", newObservations);
  };

  const removeObservation = (index: number) => {
    const newObservations = observations.filter((_, i) => i !== index);
    updateField("observations", newObservations);
  };

  return (
    <div className="space-y-6">
      {/* Installation Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Installation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date of Installation</Label>
              <Input
                type="date"
                value={(data.installation_date as string) || ""}
                onChange={(e) => updateField("installation_date", e.target.value)}
              />
            </div>
            <div>
              <Label>Evidence of Alterations</Label>
              <Select
                value={(data.alterations_evidence as string) || ""}
                onValueChange={(v) => updateField("alterations_evidence", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Supply Type</Label>
              <Select
                value={(data.supply_type as string) || ""}
                onValueChange={(v) => updateField("supply_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tncs">TN-C-S</SelectItem>
                  <SelectItem value="tns">TN-S</SelectItem>
                  <SelectItem value="tt">TT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Number of Phases</Label>
              <Select
                value={(data.phases as string) || ""}
                onValueChange={(v) => updateField("phases", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Phase</SelectItem>
                  <SelectItem value="three">Three Phase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Voltage (V)</Label>
              <Input
                type="number"
                value={(data.voltage as string) || "230"}
                onChange={(e) => updateField("voltage", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Main Fuse Rating (A)</Label>
              <Input
                type="number"
                value={(data.main_fuse_rating as string) || ""}
                onChange={(e) => updateField("main_fuse_rating", e.target.value)}
              />
            </div>
            <div>
              <Label>Consumer Unit Type</Label>
              <Input
                value={(data.consumer_unit_type as string) || ""}
                onChange={(e) => updateField("consumer_unit_type", e.target.value)}
                placeholder="e.g., Metal clad, 17th Edition"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Test Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Ze (Ω)</Label>
              <Input
                type="number"
                step="0.01"
                value={(data.ze as string) || ""}
                onChange={(e) => updateField("ze", e.target.value)}
                placeholder="e.g., 0.35"
              />
            </div>
            <div>
              <Label>Zs (Ω)</Label>
              <Input
                type="number"
                step="0.01"
                value={(data.zs as string) || ""}
                onChange={(e) => updateField("zs", e.target.value)}
                placeholder="e.g., 0.8"
              />
            </div>
            <div>
              <Label>PFC (kA)</Label>
              <Input
                type="number"
                step="0.1"
                value={(data.pfc as string) || ""}
                onChange={(e) => updateField("pfc", e.target.value)}
                placeholder="e.g., 16"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>RCD Test (ms)</Label>
              <Input
                type="number"
                value={(data.rcd_test as string) || ""}
                onChange={(e) => updateField("rcd_test", e.target.value)}
                placeholder="e.g., 28"
              />
            </div>
            <div>
              <Label>RCD Type</Label>
              <Select
                value={(data.rcd_type as string) || ""}
                onValueChange={(v) => updateField("rcd_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ac">Type AC</SelectItem>
                  <SelectItem value="a">Type A</SelectItem>
                  <SelectItem value="b">Type B</SelectItem>
                  <SelectItem value="rcbo">RCBO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Observations</span>
            <div className="flex gap-1">
              {OBSERVATION_CODES.map((o) => (
                <Badge key={o.code} variant={o.color} className="text-xs">
                  {o.code}
                </Badge>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {observations.map((obs, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-2">
                <Select
                  value={obs.code}
                  onValueChange={(v) => updateObservation(index, "code", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Code" />
                  </SelectTrigger>
                  <SelectContent>
                    {OBSERVATION_CODES.map((o) => (
                      <SelectItem key={o.code} value={o.code}>
                        {o.code} - {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Input
                  value={obs.location}
                  onChange={(e) => updateObservation(index, "location", e.target.value)}
                  placeholder="Location"
                />
              </div>
              <div className="col-span-6">
                <Input
                  value={obs.observation}
                  onChange={(e) => updateObservation(index, "observation", e.target.value)}
                  placeholder="Observation details"
                />
              </div>
              <div className="col-span-1">
                <button
                  type="button"
                  onClick={() => removeObservation(index)}
                  className="text-destructive hover:text-destructive/80 p-2"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addObservation}
            className="text-sm text-primary hover:underline"
          >
            + Add Observation
          </button>
        </CardContent>
      </Card>

      {/* Overall Assessment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Overall Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Installation Condition</Label>
            <Select
              value={(data.overall_condition as string) || ""}
              onValueChange={(v) => updateField("overall_condition", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select overall condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="satisfactory">Satisfactory</SelectItem>
                <SelectItem value="unsatisfactory">Unsatisfactory</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Next Inspection Recommendation</Label>
            <Select
              value={(data.next_inspection_period as string) || ""}
              onValueChange={(v) => updateField("next_inspection_period", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Year</SelectItem>
                <SelectItem value="2">2 Years</SelectItem>
                <SelectItem value="3">3 Years</SelectItem>
                <SelectItem value="5">5 Years</SelectItem>
                <SelectItem value="10">10 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Additional Comments</Label>
            <Textarea
              value={(data.comments as string) || ""}
              onChange={(e) => updateField("comments", e.target.value)}
              placeholder="Any additional notes or recommendations..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
