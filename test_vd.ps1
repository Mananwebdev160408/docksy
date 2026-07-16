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
public class VDMTest {
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    public delegate int GetAllDesktopsDelegate(IntPtr self, out IntPtr ppArr);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    public delegate int GetViewForHwndDelegate(IntPtr self, IntPtr hwnd, out IntPtr view);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    public delegate int MoveViewToDesktopDelegate(IntPtr self, IntPtr view, IntPtr desktop);
    static readonly Guid CLSID_Shell = new Guid("C2F03A33-21F5-47FA-B4BB-156362A2F239");
    static readonly Guid SID_VDMInternal = new Guid("C5E0CDCA-7B6E-41B2-9FC4-D93975CC467B");
    static readonly Guid SID_AVC = new Guid("1841C6D7-4F9D-42C0-AF41-8747538F10E5");
    static readonly Guid IID_AVC = new Guid("2C08ADF0-A386-4B35-9250-0FE183476FCC");
    static readonly Guid[] IID_VDMInternal = new Guid[] {
        new Guid("A3175F2D-239C-4BD2-8AA0-EEBA8BE0DF4F"),
        new Guid("F31574D6-B682-4CDC-BD56-1827860ABEC6"),
        new Guid("EF9F1A6C-D3CC-4358-B712-F84B635BEBE7"),
    };
    public static string Test() {
        Type t = Type.GetTypeFromCLSID(CLSID_Shell);
        object shell = Activator.CreateInstance(t);
        IServiceProvider2 sp = shell as IServiceProvider2;
        if (sp == null) return "no IServiceProvider";
        IntPtr pMgr = IntPtr.Zero; int hr = -1;
        foreach (var iid in IID_VDMInternal) {
            Guid svc = SID_VDMInternal; Guid i2 = iid;
            hr = sp.QueryService(ref svc, ref i2, out pMgr);
            if (hr == 0 && pMgr != IntPtr.Zero) break;
            pMgr = IntPtr.Zero;
        }
        if (pMgr == IntPtr.Zero) return "QueryService failed hr=" + hr.ToString("X8");
        IntPtr vtable = Marshal.ReadIntPtr(pMgr);
        int getAllSlot = -1; int desktopCount = 0;
        foreach (int slot in new[] {7, 8, 4, 9}) {
            try {
                IntPtr fn = Marshal.ReadIntPtr(vtable, slot * IntPtr.Size);
                var call = Marshal.GetDelegateForFunctionPointer<GetAllDesktopsDelegate>(fn);
                IntPtr arr;
                if (call(pMgr, out arr) == 0 && arr != IntPtr.Zero) {
                    IObjectArray2 oa = (IObjectArray2)Marshal.GetObjectForIUnknown(arr);
                    uint c; oa.GetCount(out c);
                    Marshal.Release(arr);
                    if (c > 0) { getAllSlot = slot; desktopCount = (int)c; break; }
                }
            } catch {}
        }
        // Test AVC
        IntPtr pAVC = IntPtr.Zero;
        { Guid s = SID_AVC; Guid i = IID_AVC; sp.QueryService(ref s, ref i, out pAVC); }
        string avcStatus = pAVC != IntPtr.Zero ? "AVC-OK" : "AVC-FAIL";
        if (pAVC != IntPtr.Zero) Marshal.Release(pAVC);
        Marshal.Release(pMgr);
        if (getAllSlot < 0) return "no valid slot for GetAllCurrentDesktops | " + avcStatus;
        return "OK slot=" + getAllSlot + " desktops=" + desktopCount + " " + avcStatus;
    }
}
"@
try {
    Add-Type -TypeDefinition $src -ErrorAction Stop
    Write-Output ([VDMTest]::Test())
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
