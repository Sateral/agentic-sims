import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import React from 'react';

const SimulationsTab = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate New Simulations</CardTitle>
          <CardDescription>Create new physics simulations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100"></div>
              Bouncing Balls
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-100"></div>
              Particle Physics
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <div className="w-6 h-6 rounded-full bg-green-100"></div>
              Fluid Dynamics
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <div className="w-6 h-6 rounded-full bg-yellow-100"></div>
              Gravity Sim
            </Button>
          </div>
          <Button className="w-full">Generate All Types (20 videos)</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Simulation Performance</CardTitle>
          <CardDescription>AI scores by simulation type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Bouncing Balls</span>
                <span>85% avg score</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Particle Physics</span>
                <span>92% avg score</span>
              </div>
              <Progress value={92} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Fluid Dynamics</span>
                <span>78% avg score</span>
              </div>
              <Progress value={78} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Gravity Sim</span>
                <span>88% avg score</span>
              </div>
              <Progress value={88} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

SimulationsTab.displayName = 'SimulationsTab';

export default SimulationsTab;
