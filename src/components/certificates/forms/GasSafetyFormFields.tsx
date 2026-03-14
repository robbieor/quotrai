import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { type CertificateType } from "@/hooks/useCertificates";

interface Props {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  certificateType: CertificateType;
}

interface Appliance {
  location: string;
  type: string;
  make: string;
  model: string;
  flue_type: string;
  operation: string;
  ventilation: string;
  visual_condition: string;
  safety_device: string;
  co_reading: string;
  ratio: string;
  unsafe: boolean;
}

const DEFAULT_APPLIANCE: Appliance = {
  location: "",
  type: "",
  make: "",
  model: "",
  flue_type: "",
  operation: "",
  ventilation: "",
  visual_condition: "",
  safety_device: "",
  co_reading: "",
  ratio: "",
  unsafe: false,
};

export function GasSafetyFormFields({ data, onChange, certificateType }: Props) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  const appliances = (data.appliances as Appliance[]) || [{ ...DEFAULT_APPLIANCE }];

  const addAppliance = () => {
    updateField("appliances", [...appliances, { ...DEFAULT_APPLIANCE }]);
  };

  const updateAppliance = (index: number, field: keyof Appliance, value: unknown) => {
    const newAppliances = [...appliances];
    newAppliances[index] = { ...newAppliances[index], [field]: value };
    updateField("appliances", newAppliances);
  };

  const removeAppliance = (index: number) => {
    if (appliances.length > 1) {
      updateField("appliances", appliances.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-6">
      {/* Property Gas Supply */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Gas Supply Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Meter Location</Label>
              <Input
                value={(data.meter_location as string) || ""}
                onChange={(e) => updateField("meter_location", e.target.value)}
                placeholder="e.g., External cupboard"
              />
            </div>
            <div>
              <Label>ECV Location</Label>
              <Input
                value={(data.ecv_location as string) || ""}
                onChange={(e) => updateField("ecv_location", e.target.value)}
                placeholder="Emergency control valve location"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Gas Type</Label>
              <Select
                value={(data.gas_type as string) || ""}
                onValueChange={(v) => updateField("gas_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Natural Gas</SelectItem>
                  <SelectItem value="lpg">LPG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pipework Material</Label>
              <Select
                value={(data.pipework_material as string) || ""}
                onValueChange={(v) => updateField("pipework_material", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="copper">Copper</SelectItem>
                  <SelectItem value="steel">Steel</SelectItem>
                  <SelectItem value="csst">CSST</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tightness Test</Label>
              <Select
                value={(data.tightness_test as string) || ""}
                onValueChange={(v) => updateField("tightness_test", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                  <SelectItem value="let_by">Let By</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="bonding_satisfactory"
              checked={(data.bonding_satisfactory as boolean) || false}
              onCheckedChange={(checked) => updateField("bonding_satisfactory", checked)}
            />
            <Label htmlFor="bonding_satisfactory">Gas bonding satisfactory</Label>
          </div>
        </CardContent>
      </Card>

      {/* Appliances */}
      {appliances.map((appliance, index) => (
        <Card key={index}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Appliance {index + 1}</span>
              {appliances.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAppliance(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Location</Label>
                <Input
                  value={appliance.location}
                  onChange={(e) => updateAppliance(index, "location", e.target.value)}
                  placeholder="e.g., Kitchen"
                />
              </div>
              <div>
                <Label>Appliance Type</Label>
                <Select
                  value={appliance.type}
                  onValueChange={(v) => updateAppliance(index, "type", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boiler">Boiler</SelectItem>
                    <SelectItem value="fire">Gas Fire</SelectItem>
                    <SelectItem value="cooker">Cooker</SelectItem>
                    <SelectItem value="hob">Hob</SelectItem>
                    <SelectItem value="water_heater">Water Heater</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Make</Label>
                <Input
                  value={appliance.make}
                  onChange={(e) => updateAppliance(index, "make", e.target.value)}
                  placeholder="e.g., Worcester"
                />
              </div>
              <div>
                <Label>Model</Label>
                <Input
                  value={appliance.model}
                  onChange={(e) => updateAppliance(index, "model", e.target.value)}
                  placeholder="e.g., Greenstar 30i"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Flue Type</Label>
                <Select
                  value={appliance.flue_type}
                  onValueChange={(v) => updateAppliance(index, "flue_type", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open_flue">Open Flue</SelectItem>
                    <SelectItem value="room_sealed">Room Sealed</SelectItem>
                    <SelectItem value="flueless">Flueless</SelectItem>
                    <SelectItem value="n_a">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ventilation</Label>
                <Select
                  value={appliance.ventilation}
                  onValueChange={(v) => updateAppliance(index, "ventilation", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="satisfactory">Satisfactory</SelectItem>
                    <SelectItem value="unsatisfactory">Unsatisfactory</SelectItem>
                    <SelectItem value="n_a">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Visual Condition</Label>
                <Select
                  value={appliance.visual_condition}
                  onValueChange={(v) => updateAppliance(index, "visual_condition", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="satisfactory">Satisfactory</SelectItem>
                    <SelectItem value="unsatisfactory">Unsatisfactory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Operation</Label>
                <Select
                  value={appliance.operation}
                  onValueChange={(v) => updateAppliance(index, "operation", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="satisfactory">Satisfactory</SelectItem>
                    <SelectItem value="unsatisfactory">Unsatisfactory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>CO Reading (ppm)</Label>
                <Input
                  type="number"
                  value={appliance.co_reading}
                  onChange={(e) => updateAppliance(index, "co_reading", e.target.value)}
                  placeholder="e.g., 12"
                />
              </div>
              <div>
                <Label>CO/CO₂ Ratio</Label>
                <Input
                  value={appliance.ratio}
                  onChange={(e) => updateAppliance(index, "ratio", e.target.value)}
                  placeholder="e.g., 0.002"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id={`unsafe-${index}`}
                checked={appliance.unsafe}
                onCheckedChange={(checked) => updateAppliance(index, "unsafe", checked)}
              />
              <Label htmlFor={`unsafe-${index}`} className="text-destructive font-medium">
                Appliance is UNSAFE - Disconnected / Capped
              </Label>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={addAppliance} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Another Appliance
      </Button>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Summary & Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="warning_issued"
              checked={(data.warning_issued as boolean) || false}
              onCheckedChange={(checked) => updateField("warning_issued", checked)}
            />
            <Label htmlFor="warning_issued">Warning notice issued to landlord/occupier</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="gas_safe_required"
              checked={(data.gas_safe_required as boolean) || false}
              onCheckedChange={(checked) => updateField("gas_safe_required", checked)}
            />
            <Label htmlFor="gas_safe_required">Gas Safe Register notified</Label>
          </div>

          <div>
            <Label>Defects Identified</Label>
            <Textarea
              value={(data.defects as string) || ""}
              onChange={(e) => updateField("defects", e.target.value)}
              placeholder="List any defects found..."
              rows={3}
            />
          </div>

          <div>
            <Label>Remedial Action Required</Label>
            <Textarea
              value={(data.remedial_action as string) || ""}
              onChange={(e) => updateField("remedial_action", e.target.value)}
              placeholder="Describe any remedial action needed..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
