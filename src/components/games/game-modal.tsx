"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GAME_CATEGORIES, GAME_ICONS } from "@/lib/constants/games";
import { Game } from "@/lib/utils/games";
import { Slider } from "@/components/ui/slider";

interface GameFormData {
  name: string;
  description: string;
  categoryId: string;
  component: string;
  difficulty: number;
}

interface GameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GameFormData) => void;
  title: string;
  description?: string;
  initialData?: Partial<Game>;
  isLoading?: boolean;
}

export function GameModal({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  initialData,
  isLoading = false,
}: GameModalProps) {
  const [formData, setFormData] = useState<GameFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    categoryId: initialData?.categoryId || "",
    component: initialData?.component || "",
    difficulty: initialData?.difficulty || 3,
  });

  const handleChange = (field: keyof GameFormData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Select 
                value={formData.categoryId} 
                onValueChange={(value) => handleChange("categoryId", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {GAME_CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <span className="flex items-center">
                        <span className="mr-2">{GAME_ICONS[category.id]}</span>
                        <span>{category.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="component" className="text-right">
                Component
              </Label>
              <Input
                id="component"
                value={formData.component}
                onChange={(e) => handleChange("component", e.target.value)}
                className="col-span-3"
                placeholder="MemoryMatch"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Difficulty
              </Label>
              <div className="col-span-3 flex items-center gap-4">
                <Slider
                  value={[formData.difficulty]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={(value) => handleChange("difficulty", value[0])}
                  className="flex-1"
                />
                <span className="text-sm">
                  {formData.difficulty} / 5
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="col-span-3"
                placeholder="Game description..."
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 