# Device management and monitoring endpoints for the MakeupMatch dashboard

from fastapi import HTTPException, Request, Depends, Header
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import firebase_admin
from firebase_admin import auth

class HeartbeatRequest(BaseModel):
  status: str = ""  # e.g., "online", "offline", "error"

class ErrorReport(BaseModel):
    device_id: str
    error_type: str  # e.g., "sensor_failure", "network_error", "app_crash"
    error_message: str
    severity: str  # "low", "medium", "high", "critical"
    timestamp: str
    stack_trace: Optional[str] = None
    user_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class DeviceStatusUpdate(BaseModel):
    device_id: str
    status: str
    last_activity: Optional[str] = None

class MonitoringService:
    def __init__(self):
        self.last_heartbeat: Dict[str, datetime] = {}

    def update_heartbeat(self, device_id: str, device_data: Dict[str, Any]):
        self.last_heartbeat[device_id] = {"timestamp": datetime.now(), "device_data": device_data}
    
    def get_devices_status(self):
        status = {}
        for device_id, last_time in self.last_heartbeat.items():
            is_online = (datetime.now() - last_time["timestamp"]) <= timedelta(minutes=5)
            status[device_id] = {
                "is_online": is_online,
                "last_heartbeat": last_time["timestamp"].isoformat(),
                "device_data": last_time["device_data"]
            }
        return status

# Dependency to verify Firebase token
async def verify_firebase_token(authorization: str = Header(None)) -> dict:
    """
    Verify Firebase ID token from Authorization header
    Expected format: "Bearer <token>"
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        # Extract token from "Bearer <token>"
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        # Check if Firebase Admin is initialized
        if not firebase_admin._apps:
            print("ERROR: Firebase Admin SDK is not initialized!")
            raise HTTPException(status_code=500, detail="Firebase Admin SDK not initialized")
        
        # Verify the token with Firebase Admin SDK
        decoded_token = auth.verify_id_token(token)
        return decoded_token
        
    except ValueError as e:
        print(f"ValueError: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    except auth.InvalidIdTokenError as e:
        print(f"InvalidIdTokenError: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except auth.ExpiredIdTokenError as e:
        print(f"ExpiredIdTokenError: {str(e)}")
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        print(f"Token verification error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

def register_device_monitoring_endpoints(app):
    """
    Register device management and monitoring endpoints to the FastAPI application
    
    Args:
        app: FastAPI application instance
    """
    monitoring_service = MonitoringService()
    
    @app.post("/devices/heartbeat")
    async def device_heartbeat(
        heartbeat: HeartbeatRequest,
        user_info: dict = Depends(verify_firebase_token)
    ):
        """Receive heartbeat from devices to track online status"""
        try:
            # Extract user information from the verified token
            device_id = user_info.get("uid")  # Firebase user ID
            user_email = user_info.get("email")  # User email if available
            custom_claims = user_info.get("custom_claims", {})  # Custom claims
            
            # Store heartbeat in Firestore
            device_data = {
                "status": heartbeat.status,
                "user_id": device_id,
                "email": user_email,
                "custom_claims": custom_claims,
            }
            
            monitoring_service.update_heartbeat(device_id, device_data)
            
            return {
                "status": "success",
                "device_id": device_id,
                "user_email": user_email,
                "message": "Heartbeat received",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error in device_heartbeat: {type(e).__name__}: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/devices/error")
    async def report_device_error(
        error: ErrorReport,
        user_info: dict = Depends(verify_firebase_token)
    ):
        """Receive and log device errors"""
        try:
            device_id = user_info.get("uid")
            user_email = user_info.get("email")
            
            print(f"Error report from user: {device_id}, email: {user_email}")
            
            # Store error in Firestore
            error_data = {
                "device_id": error.device_id,
                "authenticated_user_id": device_id,
                "user_email": user_email,
                "error_type": error.error_type,
                "error_message": error.error_message,
                "severity": error.severity,
                "timestamp": error.timestamp,
                "stack_trace": error.stack_trace,
                "user_id": error.user_id,
                "metadata": error.metadata or {},
                "resolved": False,
                "created_at": datetime.now().isoformat()
            }
            
            return {
                "status": "success",
                "message": "Error report received",
                "severity": error.severity,
                "reported_by": user_email or device_id
            }
            
        except Exception as e:
            print(f"Error in report_device_error: {type(e).__name__}: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/devices/status")
    async def get_all_devices_status(
        user_info: dict = Depends(verify_firebase_token),
        store_brand: Optional[str] = None,
        store_location: Optional[str] = None,
        status: Optional[str] = None
    ):
        """Get status of all registered devices"""
        try:
            requesting_user = user_info.get("uid")
            user_email = user_info.get("email")
                        
            # # You can check custom claims for role-based access
            # custom_claims = user_info.get("custom_claims", {})
            # is_admin = custom_claims.get("admin", False)
            
            # if not is_admin:
            #     # Optionally restrict access based on roles
            #     raise HTTPException(status_code=403, detail="Insufficient permissions")
            
            return monitoring_service.get_devices_status()
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error in get_all_devices_status: {type(e).__name__}: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    print("Device management endpoints registered successfully")