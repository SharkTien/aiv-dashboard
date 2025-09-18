import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const maintenanceFlagPath = path.join(process.cwd(), 'maintenance.flag');
    const isMaintenanceMode = fs.existsSync(maintenanceFlagPath);

    return NextResponse.json({ 
      maintenanceMode: isMaintenanceMode,
      message: isMaintenanceMode ? 'Maintenance mode is ON' : 'Maintenance mode is OFF'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    const maintenanceFlagPath = path.join(process.cwd(), 'maintenance.flag');

    if (action === 'enable') {
      // Create flag file
      fs.writeFileSync(maintenanceFlagPath, new Date().toISOString());
      return NextResponse.json({ 
        success: true,
        maintenanceMode: true,
        message: 'Maintenance mode ENABLED'
      });
    } else if (action === 'disable') {
      // Remove flag file
      if (fs.existsSync(maintenanceFlagPath)) {
        fs.unlinkSync(maintenanceFlagPath);
      }
      return NextResponse.json({ 
        success: true,
        maintenanceMode: false,
        message: 'Maintenance mode DISABLED'
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
