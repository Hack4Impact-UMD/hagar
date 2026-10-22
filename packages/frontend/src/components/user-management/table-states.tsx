export function EmptyState({ message }: { message: string }) {
  return (
    <p
      data-testid="user-list-empty"
      className="py-12 text-center text-muted-foreground"
    >
      {message}
    </p>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <p
      role="alert"
      data-testid="user-list-error"
      className="py-12 text-center text-destructive"
    >
      {message}
    </p>
  );
}
