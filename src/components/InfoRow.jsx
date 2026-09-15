export default function InfoRow({

  label,

  value,

}) {

  return (

    <div
      style={{
        display:"flex",
        justifyContent:"space-between",
        padding:"12px 0",
        borderBottom:"1px solid var(--border)",
      }}
    >

      <strong>{label}</strong>

      <span>{value}</span>

    </div>

  );

}
