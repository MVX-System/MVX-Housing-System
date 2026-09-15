export default function SearchBox({

  value,

  onChange,

}) {

  return (

    <input
      type="text"
      placeholder="Search apartment, serial number, owner..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        maxWidth: 420,
        padding: "12px 16px",
        border: "1px solid var(--input-border)",
        borderRadius: 10,
        fontSize: 15,
        marginBottom: 20,
        boxSizing: "border-box",
      }}
    />

  );

}
