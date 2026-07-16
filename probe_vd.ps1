
# Try all known IIDs for IVirtualDesktopManagerInternal
$iids = @(
    "A3175F2D-239C-4BD2-8AA0-EEBA8BE0DF4F",  # Win11 24H2 (reported)
    "F31574D6-B682-4CDC-BD56-1827860ABEC6",  # Win11 21H2-23H2
    "EF9F1A6C-D3CC-4358-B712-F84B635BEBE7",  # Win10
    "B2F925B9-5A0F-4D2E-9F4D-2B1507593C10",  # Win11 22000-22631
    "53F5CA0B-158F-4124-900C-057158060B27",  # Newer builds (rumored)
    "94F7DBCA-F8C4-4A01-980B-B9A0FEC26CBD",  # Another variant
    "872868DA-4A7F-4C3B-B5C8-8AC2BFC6ADC9",  # 26100 potential
    "A9BC070F-4F75-4785-9FC9-17D86B89E985",  # Another variant
    "C179334C-4295-40D3-BEA1-C654D965605A",  # Potential 26200
    "0C2A4B10-3ABD-4FFE-9C7D-F4EA8F28CC17",  # Potential
    "1841C6D7-4F9D-42C0-AF41-8747538F10E5"   # SID_AVC just in case
)

$src = @"
using System;
using System.Runtime.InteropServices;

[ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("6D5140C1-7436-11CE-8034-00AA006009FA")]
public interface IServiceProvider2 { [PreserveSig] int QueryService(ref Guid svc, ref Guid iid, out IntPtr ppv); }

public class VDProbe {
    static readonly Guid CLSID_Shell = new Guid("C2F03A33-21F5-47FA-B4BB-156362A2F239");
    static readonly Guid SID_VDMInternal = new Guid("C5E0CDCA-7B6E-41B2-9FC4-D93975CC467B");

    public static string Probe(string iidStr) {
        try {
            Type t = Type.GetTypeFromCLSID(CLSID_Shell);
            object shell = Activator.CreateInstance(t);
            IServiceProvider2 sp = shell as IServiceProvider2;
            if (sp == null) return "no IServiceProvider";
            IntPtr pMgr = IntPtr.Zero;
            Guid svc = SID_VDMInternal;
            Guid iid = new Guid(iidStr);
            int hr = sp.QueryService(ref svc, ref iid, out pMgr);
            if (hr == 0 && pMgr != IntPtr.Zero) {
                Marshal.Release(pMgr);
                return "MATCH: " + iidStr;
            }
            return "hr=0x" + hr.ToString("X8") + " for " + iidStr;
        } catch (Exception ex) {
            return "EX: " + ex.Message + " for " + iidStr;
        }
    }
}
"@

Add-Type -TypeDefinition $src -ErrorAction Stop

foreach ($iid in $iids) {
    Write-Output ([VDProbe]::Probe($iid))
}
