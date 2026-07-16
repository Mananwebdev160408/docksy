
$src = @"
using System;
using System.Runtime.InteropServices;

[ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("92CA9DCD-5622-4BBA-A805-5E9F541BD8C9")]
public interface IObjectArray2 {
    [PreserveSig] int GetCount(out uint n);
    [PreserveSig] int GetAt(uint i, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out object ppv);
}
[ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("6D5140C1-7436-11CE-8034-00AA006009FA")]
public interface IServiceProvider2 { [PreserveSig] int QueryService(ref Guid svc, ref Guid iid, out IntPtr ppv); }

public class VDProbe3 {
    static readonly Guid CLSID_Shell = new Guid("C2F03A33-21F5-47FA-B4BB-156362A2F239");
    static readonly Guid SID_VDMInternal = new Guid("C5E0CDCA-7B6E-41B2-9FC4-D93975CC467B");
    static readonly Guid IID_MATCH = new Guid("53F5CA0B-158F-4124-900C-057158060B27");

    [UnmanagedFunctionPointer(CallingConvention.StdCall, SetLastError = false)]
    public delegate int GetAllDesktopsDelegate(IntPtr self, out IntPtr ppArr);

    public static string ProbeSlot(int slot) {
        Type t = Type.GetTypeFromCLSID(CLSID_Shell);
        object shell = Activator.CreateInstance(t);
        IServiceProvider2 sp = shell as IServiceProvider2;
        IntPtr pMgr = IntPtr.Zero;
        Guid svc = SID_VDMInternal; Guid iid = IID_MATCH;
        sp.QueryService(ref svc, ref iid, out pMgr);
        if (pMgr == IntPtr.Zero) return "QueryService failed";
        try {
            IntPtr vtable = Marshal.ReadIntPtr(pMgr);
            IntPtr fn = Marshal.ReadIntPtr(vtable, slot * IntPtr.Size);
            var call = Marshal.GetDelegateForFunctionPointer<GetAllDesktopsDelegate>(fn);
            IntPtr arr = IntPtr.Zero;
            int r = call(pMgr, out arr);
            if (r == 0 && arr != IntPtr.Zero) {
                try {
                    IObjectArray2 oa = (IObjectArray2)Marshal.GetObjectForIUnknown(arr);
                    uint cnt; oa.GetCount(out cnt);
                    Marshal.Release(arr);
                    return "OK count=" + cnt;
                } catch {
                    Marshal.Release(arr);
                    return "arr but QI failed";
                }
            }
            return "hr=0x" + r.ToString("X8");
        } catch (AccessViolationException) {
            return "AV";
        } catch (Exception ex) {
            return "EX:" + ex.GetType().Name;
        } finally {
            Marshal.Release(pMgr);
        }
    }
}
"@

try {
    Add-Type -TypeDefinition $src -ErrorAction Stop
} catch {
    Write-Error "Compile failed: $_"
    exit 1
}

# Probe vtable slots 3-12 one at a time safely
for ($slot = 3; $slot -le 12; $slot++) {
    $result = [VDProbe3]::ProbeSlot($slot)
    Write-Output "Slot $slot : $result"
}
